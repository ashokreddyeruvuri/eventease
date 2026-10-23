import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class EventDto {
  @IsString() name!: string;
  @IsString() category!: string;
  @IsString() date!: string;
  @IsString() time!: string;
  @IsString() location!: string;
  @IsNumber() @Min(1) capacity!: number;
  @IsOptional() @IsNumber() @Min(0) price = 0;
  @IsOptional() @IsBoolean() featured = false;
  @IsOptional() @IsString() desc?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() dates?: Array<{ date: string; time: string }>;
}
