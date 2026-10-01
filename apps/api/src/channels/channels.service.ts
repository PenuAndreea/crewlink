import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { type Model } from 'mongoose';
import { Channel, type ChannelDocument } from './schemas/channel.schema.js';

/** The fields a caller provides; _id and timestamps are set by MongoDB/Mongoose. */
export type CreateChannelInput = Pick<
  Channel,
  'flightNumber' | 'origin' | 'destination' | 'scheduledDeparture' | 'memberIds'
>;

/** MongoDB's error code when a write violates a unique index. */
const DUPLICATE_KEY = 11000;

@Injectable()
export class ChannelsService {
  constructor(
    @InjectModel(Channel.name) private readonly channelModel: Model<Channel>,
  ) {}

  async create(input: CreateChannelInput): Promise<ChannelDocument> {
    try {
      return await this.channelModel.create(input);
    } catch (error) {
      // The { flightNumber, scheduledDeparture } unique index rejected a second channel for the same flight.
      if (
        error instanceof mongoose.mongo.MongoServerError &&
        error.code === DUPLICATE_KEY
      ) {
        throw new ConflictException(
          'A channel for this flight and departure already exists',
        );
      }
      throw error;
    }
  }

  /** The member's channels, earliest departure first (the Flights home list). */
  findForMember(memberId: string): Promise<ChannelDocument[]> {
    return this.channelModel
      .find({ memberIds: memberId })
      .sort({ scheduledDeparture: 1 })
      .exec();
  }
}
