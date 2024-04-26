import { IsNotEmpty, IsEnum, IsString, MaxLength, MinLength,Length, IsOptional } from "class-validator";
import { Profile } from "../entities/profile.entity";
import { Transform } from "class-transformer";
import validator from "validator";

export class CreateProfileDto extends Profile {
    
    // @IsNotEmpty({ message: 'required' })
    // @IsObject()
    // data: string;
    
    // @MaxLength(15, { message: "Name should be a maximum of 15 characters!" })
    // @MinLength(3, { message: "Name should be a minimum of 3 characters!" })
    @Transform(({ value }) => validator.trim(value))
    @Length(3,15, { message: "Name should be 3 to 15 characters!" })
    @IsNotEmpty({ message: 'Name field is required' })
    first_name: string;

    // @Length(3,15, { message: "Middle name should be 3 to 15 characters!" })
    // @IsNotEmpty({ message: 'Middle name field is required' })
    @Transform(({ value }) => validator.trim(value))
    @IsOptional()
    middle_name: string;
    
    @Transform(({ value }) => validator.trim(value))
    // @Length(3,15,{message:"Surname should be 3 to 15 characters!"})
    @IsNotEmpty({ message: 'Surname field is required' })
    last_name: string;
  
    // @IsNotEmpty({ message: 'Country field is required' })
    country: string;
    
    // @IsNotEmpty({ message: 'Currency field is required' })
    currency: string;

    // @IsNotEmpty({ message: 'Passport id field is required' })
    passport_id: string;

    // @IsEnum([1,2,3], { message: 'Gender must be either male , female or other' })
    // @IsNotEmpty({ message: 'Gender field is required' })
    gender: string;
}
