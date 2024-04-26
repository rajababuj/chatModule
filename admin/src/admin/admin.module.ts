import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { MongooseModule } from '@nestjs/mongoose';



import { ContactUs, ContactUsSchema } from './entities/contactus.entity';
import { AdminController } from './admin.controller';
import { User, UserSchema } from './entities/user.entity';
import { Profile, ProfileSchema } from './entities/profile.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ContactUs.name, schema: ContactUsSchema}], 'authdb'),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema}], 'authdb'),
    MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }], 'authdb'),
  ],
  controllers: [ AdminController],
  providers: [AdminService],
})
export class AdminModule { }
