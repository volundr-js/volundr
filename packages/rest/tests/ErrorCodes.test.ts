import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RESTJSONErrorCodes } from "../src/ErrorCodes.js";

describe("RESTJSONErrorCodes", () => {
    it("should define GeneralError as 0", () => {
        assert.equal(RESTJSONErrorCodes.GeneralError, 0);
    });

    it("should define common Unknown* codes", () => {
        assert.equal(RESTJSONErrorCodes.UnknownAccount, 10001);
        assert.equal(RESTJSONErrorCodes.UnknownChannel, 10003);
        assert.equal(RESTJSONErrorCodes.UnknownGuild, 10004);
        assert.equal(RESTJSONErrorCodes.UnknownMember, 10007);
        assert.equal(RESTJSONErrorCodes.UnknownMessage, 10008);
        assert.equal(RESTJSONErrorCodes.UnknownRole, 10011);
        assert.equal(RESTJSONErrorCodes.UnknownUser, 10013);
        assert.equal(RESTJSONErrorCodes.UnknownEmoji, 10014);
        assert.equal(RESTJSONErrorCodes.UnknownWebhook, 10015);
        assert.equal(RESTJSONErrorCodes.UnknownInteraction, 10062);
        assert.equal(RESTJSONErrorCodes.UnknownApplicationCommand, 10063);
    });

    it("should define bot endpoint codes", () => {
        assert.equal(RESTJSONErrorCodes.BotsCannotUseThisEndpoint, 20001);
        assert.equal(RESTJSONErrorCodes.OnlyBotsCanUseThisEndpoint, 20002);
    });

    it("should define maximum limit codes", () => {
        assert.equal(RESTJSONErrorCodes.MaximumNumberOfGuildsReached, 30001);
        assert.equal(RESTJSONErrorCodes.MaximumNumberOfPinsReachedForTheChannel, 30003);
        assert.equal(RESTJSONErrorCodes.MaximumNumberOfGuildRolesReached, 30005);
        assert.equal(RESTJSONErrorCodes.MaximumNumberOfWebhooksReached, 30007);
        assert.equal(RESTJSONErrorCodes.MaximumNumberOfEmojisReached, 30008);
        assert.equal(RESTJSONErrorCodes.MaximumNumberOfApplicationCommandsReached, 30032);
    });

    it("should define authorization codes", () => {
        assert.equal(RESTJSONErrorCodes.Unauthorized, 40001);
        assert.equal(RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged, 40060);
    });

    it("should define permission/access codes", () => {
        assert.equal(RESTJSONErrorCodes.MissingAccess, 50001);
        assert.equal(RESTJSONErrorCodes.YouLackPermissionsToPerformThatAction, 50013);
        assert.equal(RESTJSONErrorCodes.InvalidAuthenticationTokenProvided, 50014);
        assert.equal(RESTJSONErrorCodes.InvalidFormBodyOrContentType, 50035);
    });

    it("should define thread codes", () => {
        assert.equal(RESTJSONErrorCodes.ThreadIsLocked, 160005);
        assert.equal(RESTJSONErrorCodes.MaximumNumberOfActiveThreadsReached, 160006);
    });

    it("should define auto moderation codes", () => {
        assert.equal(RESTJSONErrorCodes.MessageWasBlockedByAutomaticModeration, 200000);
        assert.equal(RESTJSONErrorCodes.TitleWasBlockedByAutomaticModeration, 200001);
    });

    it("should have all values as numbers", () => {
        for (const [key, value] of Object.entries(RESTJSONErrorCodes)) {
            assert.equal(typeof value, "number", `${key} should be a number`);
        }
    });

    it("should have all unique values", () => {
        const values = Object.values(RESTJSONErrorCodes);
        const unique = new Set(values);
        assert.equal(values.length, unique.size, "All error codes should be unique");
    });

    it("should have more than 100 error codes defined", () => {
        const count = Object.keys(RESTJSONErrorCodes).length;
        assert.ok(count > 100, `Expected > 100 error codes, got ${count}`);
    });
});
