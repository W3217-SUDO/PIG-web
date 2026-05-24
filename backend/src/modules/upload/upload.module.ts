import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadAsset } from './upload-asset.entity';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [TypeOrmModule.forFeature([UploadAsset])],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
