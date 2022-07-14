export class ParentalRating {
    // Gets or sets the name
    public Name: string;

    /// Gets or sets the value
    public Value: number;

    constructor(name: string, value: number) {
        this.Name = name;
        this.Value = value;
    }
}
