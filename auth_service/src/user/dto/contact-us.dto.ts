import { IsEmail, IsNotEmpty, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import validator from 'validator';
import { ContactUs } from '../entities/contactus.entity';

export class ContactUsDto extends ContactUs {

  @Transform(({ value }) => validator.trim(value))
  @Length(3,15, { message: "First name should be 3 to 15 characters!" })
  @IsNotEmpty({ message: 'First name field is required' })
  firstName: string;

  @Transform(({ value }) => validator.trim(value))
  @Length(3,15, { message: "Last name should be 3 to 15 characters!" })
  @IsNotEmpty({ message: 'Last name field is required' })
  lastName: string;

  @IsEmail()
  @IsNotEmpty({ message: 'Email field is required' })
  email: string;

  @IsNotEmpty({ message: 'Reason field is required' })
  reason: string;
  
}
