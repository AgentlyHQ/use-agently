import { AixyzServer } from "aixyz/server";
import { useA2A } from "aixyz/server/adapters/a2a";
import { facilitator } from "aixyz/accepts";
import * as agent from "./app/agent";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const server = new AixyzServer(facilitator);
useA2A(server, agent);
server.express.listen(PORT);
