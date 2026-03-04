import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // Toujours répondre OK pour éviter l'énumération d'emails
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
    }

    // Invalider les anciens tokens non utilisés pour cet email
    await this.prisma.passwordResetToken.updateMany({
      where: { email: dto.email, used: false },
      data: { used: true },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await this.prisma.passwordResetToken.create({
      data: { email: dto.email, token, expiresAt },
    });

    const domain = this.configService.get<string>('DOMAIN') || 'localhost';
    const protocol = domain === 'localhost' ? 'http' : 'https';
    const resetUrl = `${protocol}://${domain}/reset-password?token=${token}`;

    await this.sendResetEmail(dto.email, resetUrl);

    return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
  }

  async checkResetToken(token: string) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Ce lien est invalide, déjà utilisé ou expiré.');
    }

    return { valid: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });

    if (!resetToken) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    if (resetToken.used) {
      throw new BadRequestException('Ce lien a déjà été utilisé');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Ce lien a expiré');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: resetToken.email },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await this.prisma.passwordResetToken.update({
      where: { token: dto.token },
      data: { used: true },
    });

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  private async sendResetEmail(email: string, resetUrl: string) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT') || 587;
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    const smtpFrom = this.configService.get<string>('SMTP_FROM') || 'noreply@opticar.app';

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('[OptiCar] SMTP non configuré — lien de reset:', resetUrl);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const templatePath = path.join(__dirname, 'templates', 'reset-password.html');
    let html = fs.readFileSync(templatePath, 'utf-8');
    html = html.replace('{{RESET_URL}}', resetUrl);

    await transporter.sendMail({
      from: `"OptiCar" <${smtpFrom}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe OptiCar',
      html,
    });
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
