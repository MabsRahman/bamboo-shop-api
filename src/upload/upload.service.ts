import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class UploadService {
  
  generateFileUrl(file: Express.Multer.File, subfolder: string = ''): { url: string; filename: string } {
    if (!file) {
      throw new BadRequestException('Binary data stream execution failed: File is missing');
    }

    const pathSegment = subfolder ? `uploads/${subfolder}` : 'uploads';
    const serverUrl = `http://localhost:3000/${pathSegment}/${file.filename}`;

    return {
      url: serverUrl,
      filename: file.filename,
    };
  }
}