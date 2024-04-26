import { IsNotEmpty, Length, Matches } from "class-validator";
import { User } from "../entities/user.entity";
import { Match } from "../match.decorator";

export class UpdatePasswordDto extends User {


    @IsNotEmpty({ message: 'Current password field is required' })
    current_password: string;

    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()-=_+])[A-Za-z\d!@#$%^&*()-=_+]{8,}$/, { message: 'Password should contain at least one uppercase, lowercase, number, and special character (!@#$%^&*) without space' })
    @Length(8, 15, { message: 'New Password should be a 8 to 15 character!' })
    @IsNotEmpty({ message: 'New password field is required' })
    new_password: string;

    @Match('new_password', {message: 'Confirm password and new password must match exactly'})
    @Length(8, 15, { message: 'Confirm Password should be a 8 to 15 character!' })
    @IsNotEmpty({ message: 'Confirm password field is required' })
    confirm_password: string;
}
