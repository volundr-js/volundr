import { ThreadPool } from "./src/pool/ThreadPool.js";
import { Logger, LogLevel } from "@volundr/logger";

Logger.setLevel(LogLevel.DEBUG);

const pool = new ThreadPool({ size: 4 });

async function main() {
  console.log("iniciando tarefas...");

  // teste básico
  const resultado = await pool.run((x: number) => x * 2, 21);
  console.log("resultado:", resultado); // 42

  // teste com várias tarefas ao mesmo tempo
  const tarefas = Array.from({ length: 8 }, (_, i) =>
    pool.run((n: number) => {
      let sum = 0;
      for (let j = 0; j < 1_000_000; j++) sum += j;
      return sum + n;
    }, i)
  );

  const resultados = await Promise.all(tarefas);
  console.log("resultados:", resultados);

  // teste async
  const asyncResult = await pool.run(async (ms: number) => {
    await new Promise((r) => setTimeout(r, ms));
    return "async works!";
  }, 100);
  console.log("async:", asyncResult);

  // graceful shutdown
  await pool.close();
  console.log("pool encerrado com sucesso");
}

main().catch(console.error);
