import { Module } from '@nestjs/common';
import { ChannelsService } from './channels.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Channel, ChannelSchema } from './schemas/channel.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Channel.name, schema: ChannelSchema }]),
  ],
  providers: [ChannelsService],
})
export class ChannelsModule {}
