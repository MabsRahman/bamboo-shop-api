import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { RatingService } from './rating.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from 'src/common/types/jwt-payload.interface';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateRatingDto) {
    const userId = req.user?.sub;
    if (!userId) throw new UnauthorizedException('You must be logged in to create a rating');
    return this.ratingService.create(dto, userId);
  }

  @Get()
  findAll(@Query('productId') productId?: number) {
    return this.ratingService.findAll(productId ? Number(productId) : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ratingService.findOne(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: CreateRatingDto) {
    const userId = req.user?.sub;
    if (!userId) throw new UnauthorizedException();
    return this.ratingService.update(Number(id), dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Req() req: AuthRequest, @Param('id') id: string) {
    const userId = req.user?.sub;
    if (!userId) throw new UnauthorizedException();
    return this.ratingService.remove(Number(id), userId);
  }
  
}
