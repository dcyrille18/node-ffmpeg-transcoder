import * as fs from 'fs';
import { compact, isEmpty } from 'lodash';
import path from 'path';
import { compareStringIgnoreCase } from '../helpers/StringHelper';
import { Configuration } from '../interfaces/Configuration';
import { CountryInfo } from './Types/CountryInfo';

import { Culture } from './Types/Culture';
import { LocalizationOption } from './Types/LocalizationOptions';
import { ParentalRating } from './Types/ParentalRating';

export class LocalizationManager {
    private DefaultCulture = 'en-US';
    private static readonly _unratedValues = ['n/a', 'unrated', 'not rated'];
    private readonly _allParentalRatings = new Map<string, Map<string, ParentalRating>>();
    private readonly _dictionaries = new Map<string, Map<string, string>>();
    private _cultures: Culture[] = [];
    private _countries: CountryInfo[] = [];

    constructor(private readonly configuration: Configuration) {
        this.LoadAll();
    }

    // Loads all resources into memory.
    private LoadAll(): void {
        this.LoadParentalRatings();
        this.LoadCultures();
        this.LoadCountries();
        this.LoadDictionaries();
    }

    private LoadParentalRatings(): void {
        const files = fs.readdirSync(path.join(__dirname, 'Ratings'));
        files.forEach((filename) => {
            const dict = new Map<string, ParentalRating>();
            const countryCode = filename.substring(0, 2);
            const fileContent: string[] = compact((fs.readFileSync(path.join(__dirname, 'Ratings', filename)).toString().split('\n')));
            fileContent.forEach(line => {
                const parts = line.split(',');
                if (parts.length === 2) {
                    const name = parts[0];
                    const value = parseInt(parts[1], 10);
                    dict.set(name, new ParentalRating(name, value));
                }
            });
            this._allParentalRatings.set(countryCode, dict);
        });
    }

    private LoadCountries(): void {
        const content: string = fs.readFileSync(path.join(__dirname, 'countries.json')).toString();
        this._countries = JSON.parse(content);
    }

    private LoadCultures(): void {
        const list: Culture[] = [];
        const lines: string[] = compact((fs.readFileSync(path.join(__dirname, 'iso6392.txt')).toString().split('\n')));
        for (const line of lines) {
            const parts = line.split('|');
            if (parts.length === 5) {
                const name = parts[3];
                if (isEmpty(name)) {
                    continue;
                }

                const twoCharName = parts[2];
                if (isEmpty(twoCharName)) {
                    continue;
                }

                let threeletterNames: string[] = [];
                if (isEmpty(parts[1])) {
                    threeletterNames.push(parts[0]);
                } else {
                    threeletterNames.push(parts[0], parts[1]);
                }

                list.push(new Culture(name, name, twoCharName, threeletterNames));
            }
            this._cultures = list;
        }
    }

    private LoadDictionaries(): void {
        const files = fs.readdirSync(path.join(__dirname, 'Core'));
        files.forEach((filename) => {
            const culture = filename.substring(0, filename.lastIndexOf('.'));
            const fileContent: Map<string, string> = new Map(Object.entries(JSON.parse(fs.readFileSync(path.join(__dirname, 'Core', filename)).toString())));
            this._dictionaries.set(culture, fileContent);
        });
    }

    public FindLanguageInfo(language: string): Culture {
        for (const culture of this._cultures) {
            if (compareStringIgnoreCase(language, culture.DisplayName)
                || compareStringIgnoreCase(language, culture.Name)
                || culture.ThreeLetterISOLanguageNames.indexOf(language) !== -1
                || compareStringIgnoreCase(language, culture.TwoLetterISOLanguageName)) {
                return culture;
            }
        }
        return this.FindLanguageInfo('eng');
    }

    // Gets the cultures.
    public GetCultures(): Culture[] {
        return this._cultures;
    }

    public GetCountries(): CountryInfo[] {
        return this._countries;
    }

    public GetParentalRatings(): ParentalRating[] {
        return Array.from(this.GetParentalRatingsDictionary().values());
    }

    public GetRatingLevel(rating: string): number {
        if (isEmpty(rating)) {
            throw new Error('ArgumentNullException(nameof(rating))');
        }

        if (LocalizationManager._unratedValues.indexOf(rating) !== -1) {
            return null;
        }

        // Fairly common for some users to have "Rated R" in their rating field
        rating = rating.replace('Rated ', '');

        const ratingsDictionary = this.GetParentalRatingsDictionary();
        const value = ratingsDictionary.get(rating);
        if (value) {
            return value.Value;
        }

        // If we don't find anything check all ratings systems
        for (const dictionary of this._allParentalRatings.values()) {
            const value = dictionary.get(rating);
            if (value) {
                return value.Value;
            }
        }

        // Try splitting by : to handle "Germany: FSK 18"
        const index = rating.indexOf(':');
        if (index != -1) {
            const trimmedRating = rating.substring(index + 1).trim();
            if (!isEmpty(trimmedRating)) {
                return this.GetRatingLevel(trimmedRating);
            }
        }

        // TODO: Further improve by normalizing out all spaces and dashes
        return null;
    }

    public GetLocalizedString(phrase: string, culture?: string): string {
        if (isEmpty(culture)) {
            culture = this.configuration.DefaultCulture;
        }

        if (isEmpty(culture)) {
            culture = this.DefaultCulture;
        }

        console.log('----> ', culture)
        const dictionary = this.GetLocalizationDictionary(culture);
        console.log('----> ', dictionary)
        const value = dictionary?.get(phrase);
        if (value) {
            return value;
        }

        return phrase;
    }

    public GetLocalizationOptions(): LocalizationOption[] {
        return [
            new LocalizationOption('Afrikaans', 'af'),
            new LocalizationOption('??????????????', 'ar'),
            new LocalizationOption('????????????????????', 'be'),
            new LocalizationOption('??????????????????', 'bg-BG'),
            new LocalizationOption('??????????????? (????????????????????????)', 'bn'),
            new LocalizationOption('Catal??', 'ca'),
            new LocalizationOption('??e??tina', 'cs'),
            new LocalizationOption('Cymraeg', 'cy'),
            new LocalizationOption('Dansk', 'da'),
            new LocalizationOption('Deutsch', 'de'),
            new LocalizationOption('English (United Kingdom)', 'en-GB'),
            new LocalizationOption('English', 'en-US'),
            new LocalizationOption('????????????????', 'el'),
            new LocalizationOption('Esperanto', 'eo'),
            new LocalizationOption('Espa??ol', 'es'),
            new LocalizationOption('Espa??ol americano', 'es_419'),
            new LocalizationOption('Espa??ol (Argentina)', 'es-AR'),
            new LocalizationOption('Espa??ol (Dominicana)', 'es_DO'),
            new LocalizationOption('Espa??ol (M??xico)', 'es-MX'),
            new LocalizationOption('Eesti', 'et'),
            new LocalizationOption('??????????', 'fa'),
            new LocalizationOption('Suomi', 'fi'),
            new LocalizationOption('Filipino', 'fil'),
            new LocalizationOption('Fran??ais', 'fr'),
            new LocalizationOption('Fran??ais (Canada)', 'fr-CA'),
            new LocalizationOption('Galego', 'gl'),
            new LocalizationOption('Schwiizerd??tsch', 'gsw'),
            new LocalizationOption('????????????????', 'he'),
            new LocalizationOption('??????????????????', 'hi'),
            new LocalizationOption('Hrvatski', 'hr'),
            new LocalizationOption('Magyar', 'hu'),
            new LocalizationOption('Bahasa Indonesia', 'id'),
            new LocalizationOption('??slenska', 'is'),
            new LocalizationOption('Italiano', 'it'),
            new LocalizationOption('?????????', 'ja'),
            new LocalizationOption('Qazaq??a', 'kk'),
            new LocalizationOption('?????????', 'ko'),
            new LocalizationOption('Lietuvi??', 'lt'),
            new LocalizationOption('Latvie??u', 'lv'),
            new LocalizationOption('????????????????????', 'mk'),
            new LocalizationOption('??????????????????', 'ml'),
            new LocalizationOption('???????????????', 'mr'),
            new LocalizationOption('Bahasa Melayu', 'ms'),
            new LocalizationOption('Norsk bokm??l', 'nb'),
            new LocalizationOption('??????????????????', 'ne'),
            new LocalizationOption('Nederlands', 'nl'),
            new LocalizationOption('Norsk nynorsk', 'nn'),
            new LocalizationOption('??????????????????', 'pa'),
            new LocalizationOption('Polski', 'pl'),
            new LocalizationOption('Pirate', 'pr'),
            new LocalizationOption('Portugu??s', 'pt'),
            new LocalizationOption('Portugu??s (Brasil)', 'pt-BR'),
            new LocalizationOption('Portugu??s (Portugal)', 'pt-PT'),
            new LocalizationOption('Rom??ne??te', 'ro'),
            new LocalizationOption('??????????????', 'ru'),
            new LocalizationOption('Sloven??ina', 'sk'),
            new LocalizationOption('Sloven????ina', 'sl-SI'),
            new LocalizationOption('Shqip', 'sq'),
            new LocalizationOption('????????????', 'sr'),
            new LocalizationOption('Svenska', 'sv'),
            new LocalizationOption('???????????????', 'ta'),
            new LocalizationOption('??????????????????', 'te'),
            new LocalizationOption('?????????????????????', 'th'),
            new LocalizationOption('T??rk??e', 'tr'),
            new LocalizationOption('????????????????????', 'uk'),
            new LocalizationOption('????????????', 'ur_PK'),
            new LocalizationOption('Ti???ng Vi???t', 'vi'),
            new LocalizationOption('?????? (?????????)', 'zh-CN'),
            new LocalizationOption('?????? (?????????)', 'zh-TW'),
            new LocalizationOption('????????? (??????)', 'zh-HK'),
        ];
    }

    private GetLocalizationDictionary(culture: string): Map<string, string> {
        if (isEmpty(culture)) {
            throw new Error('ArgumentNullException(nameof(culture))');
        }

        let item = this._dictionaries.get(culture);
        if (!item) {
            item = this._dictionaries.get(this.DefaultCulture);
        }
        return item;
    }

    // Gets the parental ratings' dictionary.
    private GetParentalRatingsDictionary(): Map<string, ParentalRating> {
        let countryCode = this.configuration.MetadataCountryCode;
        if (isEmpty(countryCode)) {
            countryCode = 'us';
        }
        return this.GetRatings(countryCode) ?? this.GetRatings('us');
    }

    // Gets the ratings.
    private GetRatings(countryCode: string): Map<string, ParentalRating> {
        return this._allParentalRatings.get(countryCode);
    }

}
