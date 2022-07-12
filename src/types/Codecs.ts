import { isEmpty } from 'lodash';
import { compareStringIgnoreCase } from '../helpers/StringHelper';

export enum Codec {
  Encoder,
  Decoder,
}

export class AudioCodec {
  public static GetFriendlyName(codec: string): string {
    if (isEmpty(codec)) {
      return codec;
    }

    if (compareStringIgnoreCase(codec, 'ac3')) {
      return 'Dolby Digital';
    } else if (compareStringIgnoreCase(codec, 'eac3')) {
      return 'Dolby Digital+';
    } else if (compareStringIgnoreCase(codec, 'dca')) {
      return 'DTS';
    }

    return codec;
  }
}
