import { execSync } from 'child_process';
import { compact, intersection, isEmpty } from 'lodash';

import { Codec } from '../types/Codecs';
import { isLinux } from '../helpers/PlatformHelper';
import { LoggerInterface } from '../interfaces/LoggerInterface';
import { Version } from '../types/Version';

export class EncoderValidator {
  private static readonly _requiredDecoders: string[] = [
    'h264',
    'hevc',
    'vp8',
    'libvpx',
    'vp9',
    'libvpx-vp9',
    'av1',
    'libdav1d',
    'mpeg2video',
    'mpeg4',
    'msmpeg4',
    'dts',
    'ac3',
    'aac',
    'mp3',
    'flac',
    'h264_qsv',
    'hevc_qsv',
    'mpeg2_qsv',
    'vc1_qsv',
    'vp8_qsv',
    'vp9_qsv',
    'av1_qsv',
    'h264_cuvid',
    'hevc_cuvid',
    'mpeg2_cuvid',
    'vc1_cuvid',
    'mpeg4_cuvid',
    'vp8_cuvid',
    'vp9_cuvid',
    'av1_cuvid',
  ];

  private static readonly _requiredEncoders = [
    'libx264',
    'libx265',
    'mpeg4',
    'msmpeg4',
    'libvpx',
    'libvpx-vp9',
    'aac',
    'libfdk_aac',
    'ac3',
    'libmp3lame',
    'libopus',
    'libvorbis',
    'flac',
    'srt',
    'h264_amf',
    'hevc_amf',
    'h264_qsv',
    'hevc_qsv',
    'h264_nvenc',
    'hevc_nvenc',
    'h264_vaapi',
    'hevc_vaapi',
    'h264_v4l2m2m',
    'h264_videotoolbox',
    'hevc_videotoolbox',
  ];

  private static readonly _requiredFilters = [
    // sw
    'alphasrc',
    'zscale',
    // qsv
    'scale_qsv',
    'vpp_qsv',
    'deinterlace_qsv',
    'overlay_qsv',
    // cuda
    'scale_cuda',
    'yadif_cuda',
    'tonemap_cuda',
    'overlay_cuda',
    'hwupload_cuda',
    // opencl
    'scale_opencl',
    'tonemap_opencl',
    'overlay_opencl',
    // vaapi
    'scale_vaapi',
    'deinterlace_vaapi',
    'tonemap_vaapi',
    'procamp_vaapi',
    'overlay_vaapi',
    'hwupload_vaapi',
  ];

  private static readonly _filterOptionsDict = new Map<number, string[]>([
    [0, ['scale_cuda', 'Output format (default "same")']],
    [1, ['tonemap_cuda', 'GPU accelerated HDR to SDR tonemapping']],
    [2, ['tonemap_opencl', 'bt2390']],
    [3, ['overlay_opencl', 'Action to take when encountering EOF from secondary input']],
    [4, ['overlay_vaapi', 'Action to take when encountering EOF from secondary input']],
  ]);

  // These are the library versions that corresponds to our minimum ffmpeg version 4.x according to the version table below
  private static readonly _ffmpegMinimumLibraryVersions = new Map<string, Version>([
    ['libavutil', new Version(56, 14)],
    ['libavcodec', new Version(58, 18)],
    ['libavformat', new Version(58, 12)],
    ['libavdevice', new Version(58, 3)],
    ['libavfilter', new Version(7, 16)],
    ['libswscale', new Version(5, 1)],
    ['libswresample', new Version(3, 1)],
    ['libpostproc', new Version(55, 1)],
  ]);

  private readonly _encoderPath: string;

  constructor(encoderPath: string, private readonly logger: LoggerInterface) {
    this._encoderPath = encoderPath;
  }

  // When changing this, also change the minimum library versions in _ffmpegMinimumLibraryVersions
  public static get MinVersion(): Version {
    return new Version(4, 0);
  }

  public static get MaxVersion(): Version {
    return null;
  }

  public ValidateVersion(): boolean {
    let output: string;
    try {
      output = this.GetProcessOutput(this._encoderPath, '-version');
    } catch (ex) {
      this.logger.error('Error validating encoder', ex);
      return false;
    }

    if (isEmpty(output?.trim())) {
      this.logger.error('FFmpeg validation: The process returned no result');
      return false;
    }

    return this.ValidateVersionInternal(output);
  }

  public GetDecoders(): string[] {
    return this.GetCodecs(Codec.Decoder);
  }

  public GetEncoders(): string[] {
    return this.GetCodecs(Codec.Encoder);
  }

  public GetHwaccels(): string[] {
    return this.GetHwaccelTypes();
  }

  public GetFilters(): string[] {
    return this.GetFFmpegFilters();
  }

  public GetFiltersWithOption(): Map<number, boolean> {
    return this.GetFFmpegFiltersWithOption();
  }

  public CheckFilterWithOption(filter: string, option: string): boolean {
    if (isEmpty(filter) || isEmpty(option)) {
      return false;
    }

    let output: string;
    try {
      output = this.GetProcessOutput(this._encoderPath, '-hide_banner -h filter=' + filter);
    } catch (ex) {
      this.logger.error('Error detecting the given filter', ex);
      return false;
    }

    if (output.indexOf('Filter ' + filter) !== -1) {
      return output.indexOf(option) !== -1;
    }

    this.logger.warn(`Filter: ${filter} with option ${option} is not available`);

    return false;
  }

  public GetFFmpegVersion(): Version {
    let output: string;
    try {
      output = this.GetProcessOutput(this._encoderPath, '-version');
    } catch (ex) {
      this.logger.error('Error validating encoder', ex);
      return null;
    }

    if (isEmpty(output?.trim())) {
      this.logger.error('FFmpeg validation: The process returned no result');
      return null;
    }

    this.logger.debug(`ffmpeg output: ${output}`);

    return this.GetFFmpegVersionInternal(output);
  }

  public CheckVaapiDeviceByDriverName(driverName: string, renderNodePath: string): boolean {
    if (!isLinux()) {
      return false;
    }

    if (isEmpty(driverName) || isEmpty(renderNodePath)) {
      return false;
    }

    try {
      const output = this.GetProcessOutput(this._encoderPath, '-v verbose -hide_banner -init_hw_device vaapi=va:' + renderNodePath, true);
      return output.indexOf(driverName) !== -1;
    } catch (ex) {
      this.logger.error('Error detecting the given vaapi render node path', ex);
      return false;
    }
  }

  private ValidateVersionInternal(versionOutput: string): boolean {
    if (versionOutput?.toLowerCase().indexOf('libav developers') != -1) {
      this.logger.error('FFmpeg validation: avconv instead of ffmpeg is not supported');
      return false;
    }

    // Work out what the version under test is
    const version = this.GetFFmpegVersionInternal(versionOutput);

    this.logger.info(`Found ffmpeg version ${version != null ? version.ToString() : 'unknown'}`);

    if (version === null) {
      if (EncoderValidator.MaxVersion !== null) {
        // Version is unknown
        if (EncoderValidator.MinVersion === EncoderValidator.MaxVersion) {
          this.logger.warn(`FFmpeg validation: We recommend version ${EncoderValidator.MinVersion.toString()}`);
        } else {
          this.logger.warn(
            `FFmpeg validation: We recommend a minimum of ${EncoderValidator.MinVersion.toString()} ` +
              `and maximum of ${EncoderValidator.MaxVersion.toString()}`,
          );
        }
      } else {
        this.logger.warn(`FFmpeg validation: We recommend minimum version ${EncoderValidator.MinVersion.toString()}`);
      }

      return false;
    } else if (version < EncoderValidator.MinVersion) {
      // Version is below what we recommend
      this.logger.warn(`FFmpeg validation: The minimum recommended version is ${EncoderValidator.MinVersion.toString()}`);
      return false;
    } else if (EncoderValidator.MaxVersion != null && version > EncoderValidator.MaxVersion) {
      // Version is above what we recommend
      this.logger.warn(`FFmpeg validation: The maximum recommended version is ${EncoderValidator.MinVersion.toString()}`);
      return false;
    }

    return true;
  }

  // Grabs the library names and major.minor version numbers from the 'ffmpeg -version' output
  // and condenses them on to one line.  Output format is "name1=major.minor,name2=major.minor,etc.".
  private static GetFFmpegLibraryVersions(output: string): Map<string, Version> {
    const map = new Map<string, Version>();
    const regex = new RegExp(/((?<name>lib\w+)\s+(?<major>[\d]+)\.\s*(?<minor>[\d]+))/gm);

    while (1) {
      const regexMatch = regex.exec(output);

      if (!regexMatch) {
        break;
      }

      const version = new Version(parseInt(regexMatch.groups['major'], 10), parseInt(regexMatch.groups['minor'], 10));
      map.set(regexMatch.groups['name'], version);
    }

    return map;
  }

  // Using the output from "ffmpeg -version" work out the FFmpeg version.
  // For pre-built binaries the first line should contain a string like "ffmpeg version x.y", which is easy
  // to parse. If this is not available, then we try to match known library versions to FFmpeg versions.
  // If that fails then we test the libraries to determine if they're newer than our minimum versions.
  private GetFFmpegVersionInternal(output: string): Version {
    // For pre-built binaries the FFmpeg version should be mentioned at the very start of the output
    const match = output?.match('^ffmpeg version n?((?:[\\d]+.?)+)');
    if (match) {
      return Version.Parse(match[1]);
    }

    let allVersionsValidated = true;
    const versionMap = EncoderValidator.GetFFmpegLibraryVersions(output);
    for (const minimumVersion of EncoderValidator._ffmpegMinimumLibraryVersions) {
      const foundVersion = versionMap.get(minimumVersion[0]);
      if (!foundVersion) {
        this.logger.error(`${minimumVersion[0]} version not found`);
        allVersionsValidated = false;
      } else if (foundVersion.CompareTo(minimumVersion[1]) === 0 || foundVersion.CompareTo(minimumVersion[1]) === 1) {
        this.logger.info(`Found ${minimumVersion[0]} version ${foundVersion.ToString()} (${minimumVersion[1].ToString()})`);
      } else {
        this.logger.warn(
          `Found ${minimumVersion[0]} version ${foundVersion.ToString()} lower than recommended version ${minimumVersion[1].ToString()}`,
        );
        allVersionsValidated = false;
      }
    }

    return allVersionsValidated ? EncoderValidator.MinVersion : null;
  }

  private GetHwaccelTypes(): string[] {
    let output: string = null;
    try {
      output = this.GetProcessOutput(this._encoderPath, '-hwaccels -hide_banner');
    } catch (ex) {
      this.logger.error('Error detecting available hwaccel types', ex);
    }

    if (isEmpty(output?.trim())) {
      return [];
    }

    const found = compact(output?.split(/[\r\n]+/));
    found.shift();

    this.logger.info(`Available hwaccel types: ${found?.join('/')}`);
    return found;
  }

  private GetCodecs(codec: Codec): string[] {
    const codecStr = codec === Codec.Encoder ? 'encoders' : 'decoders';

    let output;
    try {
      output = this.GetProcessOutput(this._encoderPath, '-hide_banner -' + codecStr, false);
    } catch (ex) {
      this.logger.error(`Error detecting available ${codecStr}`, ex);
      return [];
    }

    if (isEmpty(output?.trim())) {
      return [];
    }

    const required = codec === Codec.Encoder ? EncoderValidator._requiredEncoders : EncoderValidator._requiredDecoders;

    const found: string[] = [];
    const regex = /^\s\S{6}\s(?<codec>[\w|-]+)\s+.+$/gm;
    while (1) {
      const regexMatch = regex.exec(output);

      if (!regexMatch) {
        break;
      }

      found.push(regexMatch.groups['codec']);
    }

    const available = intersection(found, required);
    this.logger.info(`Available ${codecStr}: ${available}`);
    return available;
  }

  private GetFFmpegFilters(): string[] {
    let output: string;
    try {
      output = this.GetProcessOutput(this._encoderPath, '-hide_banner -filters', false);
    } catch (ex) {
      this.logger.error('Error detecting available filters', ex);
      return [];
    }

    if (isEmpty(output?.trim())) {
      return [];
    }

    const found: string[] = [];
    const regex = /^\s\S{3}\s(?<filter>[\w|-]+)\s+.+$/gm;
    while (1) {
      const regexMatch = regex.exec(output);

      if (!regexMatch) {
        break;
      }

      found.push(regexMatch.groups['filter']);
    }

    const available = intersection(found, EncoderValidator._requiredFilters);
    this.logger.info(`Available filters: ${available}`);
    return available;
  }

  private GetFFmpegFiltersWithOption(): Map<number, boolean> {
    const dict = new Map<number, boolean>();
    for (let i = 0; i < EncoderValidator._filterOptionsDict.size; i++) {
      const val = EncoderValidator._filterOptionsDict.get(i);
      if (val && val.length === 2) {
        dict.set(i, this.CheckFilterWithOption(val[0], val[1]));
      }
    }
    return dict;
  }

  private GetProcessOutput(path: string, args: string, readStdErr = false): string {
    this.logger.info(`Running command: ${path} ${args}`);
    try {
      return execSync(`${path} ${args}`, { encoding: 'utf8' });
    } catch (ex) {
      this.logger.error(`Error running command: ${path} ${args}`, ex);
      if (!readStdErr) {
        throw ex;
      }
      return ex.stderr.toString();
    }
  }
}
