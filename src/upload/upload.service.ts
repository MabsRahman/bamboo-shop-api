import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class UploadService {
  
  generateFileUrl(file: Express.Multer.File): { url: string; filename: string } {
    if (!file) {
      throw new BadRequestException('Binary data stream execution failed: File is missing');
    }

    const serverUrl = `http://localhost:3000/uploads/${file.filename}`;

    return {
      url: serverUrl,
      filename: file.filename,
    };
  }
}