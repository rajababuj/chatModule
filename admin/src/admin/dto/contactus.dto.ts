import { IsBoolean, IsNotEmpty, IsNumberString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { ContactUs } from '../entities/contactus.entity';
import validator from 'validator';

export class UpdateUserDto extends ContactUs {
  @IsNotEmpty({ message: 'Name field is required' })
  name: string;
  
  @IsNotEmpty({ message: 'Email field is required' })
  email: string;

  @Length(8, 15, { message: 'Mobile number should be a 8 to 15 digit' })
  @IsNumberString({}, { message: 'Mobile number should contain only numbers' })
  @IsNotEmpty({ message: 'Mobile number is required' })
  mobile: number; // Use string type for mobile number to support validation

  @Transform(({ value }) => validator.trim(value))
  @IsNotEmpty({ message: 'Address field is required' })
  address: string;

  @IsNotEmpty({ message: 'Password field is required' })
  password: string;

  @IsBoolean({ message: 'ProfileImage must be a boolean value' })
  profileImage: string;
}
