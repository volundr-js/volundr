import { ActivityType } from "@volundr/types";
import type { GatewayPresence, GatewayActivity } from "@volundr/gateway";

export class ActivityBuilder {
    private readonly data: GatewayActivity;

    constructor() {
        this.data = { name: "", type: ActivityType.Playing };
    }

    setName(name: string): this {
        this.data.name = name;
        return this;
    }

    setType(type: ActivityType): this {
        this.data.type = type;
        return this;
    }

    setURL(url: string): this {
        this.data.url = url;
        return this;
    }

    toJSON(): GatewayActivity {
        return { ...this.data };
    }

    // ── Static shorthand factories ──

    static playing(name: string): ActivityBuilder {
        return new ActivityBuilder().setName(name).setType(ActivityType.Playing);
    }

    static streaming(name: string, url: string): ActivityBuilder {
        return new ActivityBuilder().setName(name).setType(ActivityType.Streaming).setURL(url);
    }

    static listening(name: string): ActivityBuilder {
        return new ActivityBuilder().setName(name).setType(ActivityType.Listening);
    }

    static watching(name: string): ActivityBuilder {
        return new ActivityBuilder().setName(name).setType(ActivityType.Watching);
    }

    static competing(name: string): ActivityBuilder {
        return new ActivityBuilder().setName(name).setType(ActivityType.Competing);
    }

    static custom(name: string): ActivityBuilder {
        return new ActivityBuilder().setName(name).setType(ActivityType.Custom);
    }
}

type StatusType = "online" | "dnd" | "idle" | "invisible" | "offline";

export class PresenceBuilder {
    private readonly data: GatewayPresence = {};

    setStatus(status: StatusType): this {
        this.data.status = status;
        return this;
    }

    setAFK(afk: boolean): this {
        this.data.afk = afk;
        return this;
    }

    addActivity(activity: ActivityBuilder | GatewayActivity): this {
        this.data.activities ??= [];
        this.data.activities.push("toJSON" in activity ? activity.toJSON() : activity);
        return this;
    }

    setActivities(activities: (ActivityBuilder | GatewayActivity)[]): this {
        this.data.activities = activities.map(a => "toJSON" in a ? a.toJSON() : a);
        return this;
    }

    toJSON(): GatewayPresence {
        return { ...this.data };
    }

    // ── Static shorthand ──

    static online(): PresenceBuilder {
        return new PresenceBuilder().setStatus("online");
    }

    static idle(): PresenceBuilder {
        return new PresenceBuilder().setStatus("idle");
    }

    static dnd(): PresenceBuilder {
        return new PresenceBuilder().setStatus("dnd");
    }

    static invisible(): PresenceBuilder {
        return new PresenceBuilder().setStatus("invisible");
    }
}
