import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards, ParseIntPipe, UnauthorizedException } from '@nestjs/common';
import { RatingService } from './rating.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from 'src/common/types/jwt-payload.interface';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/guards/roles.decorator';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateRatingDto) {
    const userId = req.user.id;
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
    const userId = req.user.id;
    if (!userId) throw new UnauthorizedException();
    return this.ratingService.update(Number(id), dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Req() req: AuthRequest, @Param('id') id: string) {
    const userId = req.user.id;
    if (!userId) throw new UnauthorizedException();
    return this.ratingService.remove(Number(id), userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Get('admin/all')
  async findAllAdmin(
    @Query('status') status?: string,
    @Query('productId') productId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.ratingService.findAllAdmin(
      status,
      productId ? Number(productId) : undefined,
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Patch('admin/:id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.ratingService.updateStatus(id, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Delete('admin/:id')
  async adminRemove(@Param('id', ParseIntPipe) id: number) {
    return this.ratingService.adminRemove(id);
  }
  
}
