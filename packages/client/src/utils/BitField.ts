/**
 * Generic bit field utility class for working with Discord bitmask values.
 * Works with numeric bitfields (for flags like MessageFlags, IntentsBits, etc).
 * For permissions (bigint), use the existing Permissions class instead.
 */
export class BitField {
    bitfield: number;

    constructor(bits: BitFieldResolvable = 0) {
        this.bitfield = BitField.resolve(bits);
    }

    /** Check if this bitfield has a specific bit or bits. */
    has(bit: BitFieldResolvable): boolean {
        const resolved = BitField.resolve(bit);
        return (this.bitfield & resolved) === resolved;
    }

    /** Check if this bitfield has any of the specified bits. */
    any(bit: BitFieldResolvable): boolean {
        const resolved = BitField.resolve(bit);
        return (this.bitfield & resolved) !== 0;
    }

    /** Add bits to this bitfield. */
    add(...bits: BitFieldResolvable[]): this {
        let total = 0;
        for (const bit of bits) total |= BitField.resolve(bit);
        this.bitfield |= total;
        return this;
    }

    /** Remove bits from this bitfield. */
    remove(...bits: BitFieldResolvable[]): this {
        let total = 0;
        for (const bit of bits) total |= BitField.resolve(bit);
        this.bitfield &= ~total;
        return this;
    }

    /** Get bits that are in `bits` but missing from this bitfield. */
    missing(bits: BitFieldResolvable): number[] {
        const resolved = BitField.resolve(bits);
        const missing: number[] = [];
        for (let bit = 1; bit <= resolved; bit <<= 1) {
            if ((resolved & bit) !== 0 && !this.has(bit)) {
                missing.push(bit);
            }
        }
        return missing;
    }

    /** Check if this bitfield equals another. */
    equals(other: BitFieldResolvable): boolean {
        return this.bitfield === BitField.resolve(other);
    }

    /** Freeze this bitfield (make immutable). */
    freeze(): Readonly<this> {
        return Object.freeze(this);
    }

    /** Convert to an array of individual set bits. */
    toArray(): number[] {
        const result: number[] = [];
        for (let bit = 1; bit <= this.bitfield; bit <<= 1) {
            if ((this.bitfield & bit) !== 0) result.push(bit);
        }
        return result;
    }

    /** Iterate over individual set bits. */
    *[Symbol.iterator](): Generator<number> {
        for (let bit = 1; bit <= this.bitfield; bit <<= 1) {
            if ((this.bitfield & bit) !== 0) yield bit;
        }
    }

    valueOf(): number {
        return this.bitfield;
    }

    toJSON(): number {
        return this.bitfield;
    }

    /** Resolve a resolvable value to a raw number bitfield. */
    static resolve(bit: BitFieldResolvable): number {
        if (typeof bit === "number") return bit;
        if (bit instanceof BitField) return bit.bitfield;
        if (Array.isArray(bit)) {
            let total = 0;
            for (const b of bit) total |= BitField.resolve(b);
            return total;
        }
        return 0;
    }
}

export type BitFieldResolvable = number | BitField | BitFieldResolvable[];
