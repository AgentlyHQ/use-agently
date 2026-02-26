import { Command } from "commander";
import { giveFeedbackCommand } from "./give-feedback.js";
import { revokeFeedbackCommand } from "./revoke-feedback.js";
import { appendResponseCommand } from "./append-response.js";

export const erc8004Command = new Command("erc-8004").description("ERC-8004 reputation registry operations");

erc8004Command.addCommand(giveFeedbackCommand);
erc8004Command.addCommand(revokeFeedbackCommand);
erc8004Command.addCommand(appendResponseCommand);
