import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { VisitorService } from './visitor.service';

@Injectable()
export class VisitorMiddleware implements NestMiddleware {
  constructor(private visitorService: VisitorService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || '';
    const userAgent = req.headers['user-agent'] || '';
    const path = req.originalUrl;
    const referrer = req.headers['referer']?.toString();

    this.visitorService.logVisit(ip, userAgent, path, referrer).catch(console.error);
    next();
  }
}
