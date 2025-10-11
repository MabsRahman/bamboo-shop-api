import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.FACEBOOK_APP_ID!,
      clientSecret: process.env.FACEBOOK_APP_SECRET!,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL!,
      profileFields: ['id', 'displayName', 'emails'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: Function) { 
    const { emails, displayName } = profile;
    const email = emails && emails.length ? emails[0].value : null;

    const user = await this.authService.validateOAuthLogin(email, displayName, 'facebook');
    done(null, user);
  }
}
