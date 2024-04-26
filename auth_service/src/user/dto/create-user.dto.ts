import { IsNotEmpty, IsEmail, MaxLength, MinLength, ValidateNested,Length,IsNumberString, IsOptional } from "class-validator";
import { User } from "../entities/user.entity";
import { CreateProfileDto } from "./create-profile.dto";
import { Transform, Type } from "class-transformer";
import validator from "validator";

export class CreateUserDto extends User {

    @IsOptional()
    user_id: number;

    @Transform(({ value }) => validator.trim(value))
    @Length(3, 20, { message: 'User name should be between 3 to 20 characters' })
    @IsNotEmpty({ message: 'User name field is required' })
    username: string;

    @Transform(({ value }) => validator.trim(value))
    @Length(8,15,{message: "Mobile number should be a 8 to 15 digit!" })
    @IsNumberString({}, { message: 'Mobile number should contain only numbers' })
    @IsNotEmpty({ message: 'Mobile number is required' })
    mobile: string;

    @IsNotEmpty({ message: 'Email field is required' })
    @IsEmail()
    email: string;

    @Transform(({ value }) => validator.trim(value))
    @IsNotEmpty({ message: 'Password field is required' })
    password: string;
    
    @IsNotEmpty({ message: 'Country code field is required' })
    country_code: string;

    @ValidateNested({ each: true })
    @IsNotEmpty()
    @Type(() => CreateProfileDto)
    data: CreateProfileDto[];
}
