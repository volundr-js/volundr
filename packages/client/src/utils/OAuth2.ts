import type { Snowflake } from "@volundr/types";

export type OAuth2Scope =
    | "activities.read"
    | "activities.write"
    | "applications.builds.read"
    | "applications.builds.upload"
    | "applications.commands"
    | "applications.commands.update"
    | "applications.commands.permissions.update"
    | "applications.entitlements"
    | "applications.store.update"
    | "bot"
    | "connections"
    | "dm_channels.read"
    | "email"
    | "gdm.join"
    | "guilds"
    | "guilds.join"
    | "guilds.members.read"
    | "identify"
    | "messages.read"
    | "relationships.read"
    | "role_connections.write"
    | "rpc"
    | "rpc.activities.write"
    | "rpc.notifications.read"
    | "rpc.voice.read"
    | "rpc.voice.write"
    | "voice"
    | "webhook.incoming";

export interface OAuth2URLOptions {
    clientId: Snowflake;
    scopes: OAuth2Scope[];
    redirectUri?: string;
    permissions?: bigint | number;
    guildId?: Snowflake;
    disableGuildSelect?: boolean;
    state?: string;
    responseType?: "code" | "token";
    prompt?: "consent" | "none";
}

export interface TokenExchangeOptions {
    clientId: string;
    clientSecret: string;
    code: string;
    redirectUri: string;
}

export interface RefreshTokenOptions {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
}

export interface OAuth2TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

const BASE = "https://discord.com";

export class OAuth2 {
    static generateURL(options: OAuth2URLOptions): string {
        const params = new URLSearchParams();
        params.set("client_id", options.clientId);
        params.set("scope", options.scopes.join(" "));
        params.set("response_type", options.responseType ?? "code");

        if (options.redirectUri) params.set("redirect_uri", options.redirectUri);
        if (options.permissions != null) params.set("permissions", String(options.permissions));
        if (options.guildId) params.set("guild_id", options.guildId);
        if (options.disableGuildSelect) params.set("disable_guild_select", "true");
        if (options.state) params.set("state", options.state);
        if (options.prompt) params.set("prompt", options.prompt);

        return `${BASE}/oauth2/authorize?${params}`;
    }

    static async exchangeCode(options: TokenExchangeOptions): Promise<OAuth2TokenResponse> {
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            code: options.code,
            redirect_uri: options.redirectUri,
        });

        const response = await fetch(`${BASE}/api/v10/oauth2/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${btoa(`${options.clientId}:${options.clientSecret}`)}`,
            },
            body,
        });

        if (!response.ok) {
            throw new Error(`OAuth2 token exchange failed: ${response.status} ${await response.text()}`);
        }

        return response.json() as Promise<OAuth2TokenResponse>;
    }

    static async refreshToken(options: RefreshTokenOptions): Promise<OAuth2TokenResponse> {
        const body = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: options.refreshToken,
        });

        const response = await fetch(`${BASE}/api/v10/oauth2/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${btoa(`${options.clientId}:${options.clientSecret}`)}`,
            },
            body,
        });

        if (!response.ok) {
            throw new Error(`OAuth2 token refresh failed: ${response.status} ${await response.text()}`);
        }

        return response.json() as Promise<OAuth2TokenResponse>;
    }

    static async revokeToken(clientId: string, clientSecret: string, token: string): Promise<void> {
        const body = new URLSearchParams({ token });

        const response = await fetch(`${BASE}/api/v10/oauth2/token/revoke`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            },
            body,
        });

        if (!response.ok) {
            throw new Error(`OAuth2 token revoke failed: ${response.status} ${await response.text()}`);
        }
    }
}
