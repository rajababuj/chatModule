import { IsBoolean, IsDate, IsNotEmpty, IsNumberString, Length, MaxDate } from 'class-validator';
import { User } from '../entities/user.entity';
import { Transform } from 'class-transformer';
import validator from 'validator';

export class UpdateUserDto extends User {

  @IsNotEmpty({ message: 'Current password field is required' })
  current_password: string;
  
  @IsNotEmpty({ message: 'City field is required' })
  city: string;

  @IsNotEmpty({ message: 'Country field is required' })
  country: string;
  
  // @MaxDate(new Date(),{message: 'Birth date should be less then today'})
  @Transform( ({ value }) => value && new Date(value))
  // @IsDate({ message: 'Birth date field is should be in date format' })
  @IsNotEmpty({ message: 'Birth date field is required' })
  birthdate: Date;

  @Transform(({ value }) => validator.trim(value))
  @IsNotEmpty({ message: 'Address field is required' })
  address: string;

  @Length(8,15,{message: "Mobile number should be a 8 to 15 digit!" })
  @IsNumberString({}, { message: 'Mobile number should contain only numbers' })
  @IsNotEmpty({ message: 'Mobile number is required' })
  mobile: string;

  @IsBoolean()
  @IsNotEmpty({ message: 'Internal message setting is required' })
  internal_message: boolean;

  @IsBoolean()
  @IsNotEmpty({ message: 'Push notification setting is required' })
  push_notification: boolean;

  @IsBoolean()
  @IsNotEmpty({ message: 'Phone call setting is required' })
  phone_call: boolean;

  @IsBoolean()
  @IsNotEmpty({ message: 'Email notification setting is required' })
  e_mail: boolean;

  @IsBoolean()
  @IsNotEmpty({ message: 'SMS notification setting is required' })
  sms: boolean;
}
