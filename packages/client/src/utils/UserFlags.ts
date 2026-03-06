export const UserFlags = {
    Staff:                         1 << 0,
    Partner:                       1 << 1,
    HypeSquad:                     1 << 2,
    BugHunterLevel1:               1 << 3,
    HypeSquadOnlineHouse1:         1 << 6,
    HypeSquadOnlineHouse2:         1 << 7,
    HypeSquadOnlineHouse3:         1 << 8,
    PremiumEarlySupporter:         1 << 9,
    TeamPseudoUser:                1 << 10,
    BugHunterLevel2:               1 << 14,
    VerifiedBot:                   1 << 16,
    VerifiedDeveloper:             1 << 17,
    CertifiedModerator:            1 << 18,
    BotHTTPInteractions:           1 << 19,
    ActiveDeveloper:               1 << 22,
} as const;

export type UserFlagKey = keyof typeof UserFlags;

const flagEntries = Object.entries(UserFlags) as [UserFlagKey, number][];

export function parseUserFlags(bitfield: number): UserFlagKey[] {
    const result: UserFlagKey[] = [];
    for (const [name, value] of flagEntries) {
        if (bitfield & value) result.push(name);
    }
    return result;
}

export function hasUserFlag(bitfield: number, flag: UserFlagKey): boolean {
    return (bitfield & UserFlags[flag]) !== 0;
}

export const MemberFlags = {
    DidRejoin:                    1 << 0,
    CompletedOnboarding:          1 << 1,
    BypassesVerification:         1 << 2,
    StartedOnboarding:            1 << 3,
    IsGuest:                      1 << 4,
    StartedHomeActions:           1 << 5,
    CompletedHomeActions:         1 << 6,
    AutomodQuarantinedUsername:    1 << 7,
    DmSettingsUpsellAcknowledged: 1 << 9,
} as const;

export type MemberFlagKey = keyof typeof MemberFlags;

const memberFlagEntries = Object.entries(MemberFlags) as [MemberFlagKey, number][];

export function parseMemberFlags(bitfield: number): MemberFlagKey[] {
    const result: MemberFlagKey[] = [];
    for (const [name, value] of memberFlagEntries) {
        if (bitfield & value) result.push(name);
    }
    return result;
}

export function hasMemberFlag(bitfield: number, flag: MemberFlagKey): boolean {
    return (bitfield & MemberFlags[flag]) !== 0;
}
