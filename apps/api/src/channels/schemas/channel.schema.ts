import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, type Types } from 'mongoose';

/** A Channel loaded from MongoDB: the class fields plus Mongoose document methods (save, toJSON…). */
export type ChannelDocument = HydratedDocument<Channel>;

@Schema({
  collection: 'channels',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Channel {
  _id: Types.ObjectId;

  @Prop({
    required: true,
    set: (v: string) => v.replace(/\s+/g, '').toUpperCase(),
    match: /^([A-Z]{2}|[A-Z]\d|\d[A-Z])\d{1,4}[A-Z]?$/,
  })
  flightNumber: string; // stored as "SN2903", shown as "SN 2903"

  @Prop({ required: true, uppercase: true, trim: true, match: /^[A-Z]{3}$/ })
  origin: string; // IATA, e.g. "BRU"

  @Prop({ required: true, uppercase: true, trim: true, match: /^[A-Z]{3}$/ })
  destination: string; // IATA, e.g. "ZAG"

  @Prop({ required: true })
  scheduledDeparture: Date;

  @Prop({ required: true, type: [String] })
  memberIds: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);

ChannelSchema.index(
  { flightNumber: 1, scheduledDeparture: 1 },
  { unique: true },
);

// Serves findForMember: match on memberIds (a multikey index over the array), then sort by departure.
ChannelSchema.index({ memberIds: 1, scheduledDeparture: 1 });
