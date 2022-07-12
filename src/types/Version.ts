export class Version {
  private readonly _Major: number;
  private readonly _Minor: number;
  private readonly _Build: number = -1;
  private readonly _Revision: number = -1;

  public constructor(...args: any[]) {
    switch (args.length) {
      case 0:
        {
          this._Major = 0;
          this._Minor = 0;
        }
        break;

      case 1:
        {
          const [version] = args;
          const v = Version.Parse(version);
          this._Major = v.Major;
          this._Minor = v.Minor;
          this._Build = v.Build;
          this._Revision = v.Revision;
        }
        break;

      case 2:
        {
          const [major, minor] = args;
          if (major < 0) throw new Error('ArgumentOutOfRangeException: specified major is out of range');

          if (minor < 0) throw new Error('ArgumentOutOfRangeException: specified minor is out of range');

          this._Major = major;
          this._Minor = minor;
        }
        break;

      case 3:
        {
          const [major, minor, build] = args;
          if (major < 0) throw new Error('ArgumentOutOfRangeException: specified major is out of range');

          if (minor < 0) throw new Error('ArgumentOutOfRangeException: specified minor is out of range');

          if (build < 0) throw new Error('ArgumentOutOfRangeException: specified build is out of range');

          this._Major = major;
          this._Minor = minor;
          this._Build = build;
        }
        break;

      case 4:
        {
          const [major, minor, build, revision] = args;

          if (major < 0) throw new Error('ArgumentOutOfRangeException: specified major is out of range');

          if (minor < 0) throw new Error('ArgumentOutOfRangeException: specified minor is out of range');

          if (build < 0) throw new Error('ArgumentOutOfRangeException: specified build is out of range');

          if (revision < 0) throw new Error('ArgumentOutOfRangeException: specified revision is out of range');

          this._Major = major;
          this._Minor = minor;
          this._Build = build;
          this._Revision = revision;
        }
        break;
    }
  }

  // Properties for setting and getting version numbers
  get Major(): number {
    return this._Major;
  }

  get Minor(): number {
    return this._Minor;
  }

  get Build(): number {
    return this._Build;
  }

  get Revision(): number {
    return this._Revision;
  }

  // 0 => equals
  // 1 => bigger
  // 2 => smaller
  public CompareTo(value: Version): number {
    if (value === null) return 1;

    if (this._Major !== value._Major)
      if (this._Major > value._Major) return 1;
      else return -1;

    if (this._Minor !== value._Minor)
      if (this._Minor > value._Minor) return 1;
      else return -1;

    if (this._Build !== value._Build)
      if (this._Build > value._Build) return 1;
      else return -1;

    if (this._Revision !== value._Revision)
      if (this._Revision > value._Revision) return 1;
      else return -1;

    return 0;
  }

  public Equals(obj: Version): boolean {
    if (obj === null) return false;

    // check that major, minor, build & revision numbers match
    return !(this._Major !== obj._Major || this._Minor !== obj._Minor || this._Build !== obj._Build || this._Revision !== obj._Revision);
  }

  public ToString(): string {
    if (this._Build === -1) return `${this._Major}.${this._Minor}`;
    if (this._Revision === -1) return `${this._Major}.${this._Minor}.${this._Build}`;
    return `${this._Major}.${this._Minor}.${this._Build}.${this._Revision}`;
  }

  public static Parse(input: string): Version {
    if (input == null) {
      throw new Error('ArgumentNullException: input could not be null');
    }
    const inputs = input.split('.');
    return new Version(...inputs);
  }
}
