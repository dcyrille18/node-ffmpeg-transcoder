export class Culture {
    // Gets the name.
    public Name: string;

    // Gets the display name.
    public DisplayName: string;

    // Gets the name of the two letter ISO language.
    public TwoLetterISOLanguageName: string;

    public ThreeLetterISOLanguageNames: string[];

    // Gets the name of the three letter ISO language.
    public get ThreeLetterISOLanguageName(): string {
        const vals = this.ThreeLetterISOLanguageNames;
        if (vals.length > 0) {
            return vals[0];
        }
        return null;
    }

    constructor(name: string, displayName: string, twoLetterISOLanguageName: string, threeLetterISOLanguageNames: string[]) {
        this.Name = name;
        this.DisplayName = displayName;
        this.TwoLetterISOLanguageName = twoLetterISOLanguageName;
        this.ThreeLetterISOLanguageNames = threeLetterISOLanguageNames;
    }
}
