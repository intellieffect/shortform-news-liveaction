// 저장 방식 ZIP이 실제로 다른 프로그램에서 열리는지 본다.
// 형식이 어긋나면 Windows 탐색기와 압축 프로그램에서 조용히 «손상»으로 뜬다.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  createWriteStream,
  readFileSync,
  writeFileSync,
  statSync,
  openSync,
  ftruncateSync,
  closeSync,
} from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { writeZip } from "../scripts/lib/zip-stream.mjs";

const workspace = async () => {
  const dir = await mkdtemp(join(tmpdir(), "zip-stream-test-"));
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
};

const toFile = async (dir, entries) => {
  const path = join(dir, "out.zip");
  const out = createWriteStream(path);
  await writeZip(out, entries);
  await new Promise((done) => out.end(done));
  return path;
};

// python3 은 이미 설치 요구사항이라 별도 의존이 늘지 않는다.
const readWithPython = (zip) =>
  JSON.parse(
    execFileSync(
      "python3",
      [
        "-c",
        [
          "import json,sys,zipfile",
          "z=zipfile.ZipFile(sys.argv[1])",
          "assert z.testzip() is None",
          "print(json.dumps({i.filename: [i.file_size, i.compress_type, z.read(i.filename).hex()] for i in z.infolist()}))",
        ].join("\n"),
        zip,
      ],
      // 일부러 깨뜨린 ZIP을 검사할 때 파이썬 추적이 화면을 덮지 않게 한다.
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ),
  );

test("빈 파일·바이너리·공백 있는 이름을 담고 표준 도구가 그대로 읽는다", async (t) => {
  const { dir, cleanup } = await workspace();
  t.after(cleanup);
  const binary = Buffer.from(Array.from({ length: 5000 }, (_, i) => i % 256));
  writeFileSync(join(dir, "a.txt"), "hello zip\n");
  writeFileSync(join(dir, "b.bin"), binary);
  writeFileSync(join(dir, "c.txt"), "");
  const zip = await toFile(dir, [
    { path: join(dir, "a.txt"), name: "a.txt" },
    { path: join(dir, "b.bin"), name: "sub name.bin" },
    { path: join(dir, "c.txt"), name: "c.txt" },
  ]);

  const read = readWithPython(zip);
  assert.deepEqual(Object.keys(read), ["a.txt", "sub name.bin", "c.txt"]);
  assert.equal(read["a.txt"][1], 0, "저장 방식이어야 한다");
  assert.equal(
    Buffer.from(read["a.txt"][2], "hex").toString(),
    "hello zip\n",
  );
  assert.equal(read["sub name.bin"][0], binary.length);
  assert.ok(Buffer.from(read["sub name.bin"][2], "hex").equals(binary));
  assert.equal(read["c.txt"][0], 0);
});

test("CRC가 실제 내용과 맞아 손상 검사를 통과한다", async (t) => {
  const { dir, cleanup } = await workspace();
  t.after(cleanup);
  writeFileSync(join(dir, "x.bin"), Buffer.alloc(300000, 7));
  const zip = await toFile(dir, [{ path: join(dir, "x.bin"), name: "x.bin" }]);
  // 한 바이트만 바꿔도 검사가 깨져야 검사가 실제로 도는 것이다.
  const broken = join(dir, "broken.zip");
  const bytes = readFileSync(zip);
  bytes[Math.floor(bytes.length / 2)] ^= 0xff;
  writeFileSync(broken, bytes);
  assert.throws(() => readWithPython(broken));
  assert.ok(readWithPython(zip)["x.bin"]);
});

test("없는 파일은 쓰기 전에 알리고, 받는 쪽이 끊기면 매달리지 않는다", async (t) => {
  const { dir, cleanup } = await workspace();
  t.after(cleanup);
  await assert.rejects(
    () => toFile(dir, [{ path: join(dir, "없다.txt"), name: "없다.txt" }]),
    /ENOENT/,
  );

  writeFileSync(join(dir, "big.bin"), Buffer.alloc(4 * 1024 * 1024, 3));
  const sink = new PassThrough({ highWaterMark: 1024 });
  sink.resume();
  const writing = writeZip(sink, [
    { path: join(dir, "big.bin"), name: "big.bin" },
  ]);
  sink.destroy();
  await assert.rejects(() => writing, /끊겼다|premature/i);
});

test("묶음 전체가 4GB를 넘으면 한 바이트도 쓰기 전에 거절한다", async (t) => {
  const { dir, cleanup } = await workspace();
  t.after(cleanup);
  // 실제로 4GB를 만들지 않고 stat 만 크게 보이는 희소 파일을 쓴다.
  const path = join(dir, "sparse.bin");
  const fd = openSync(path, "w");
  ftruncateSync(fd, Math.floor(2.3 * 1024 * 1024 * 1024));
  closeSync(fd);
  assert.ok(statSync(path).size < 0xffffffff, "한 파일로는 한도를 넘지 않아야 한다");

  const sink = new PassThrough();
  let wrote = 0;
  sink.on("data", (chunk) => (wrote += chunk.length));
  await assert.rejects(
    () => writeZip(sink, [
      { path, name: "a.bin" },
      { path, name: "b.bin" },
    ]),
    /묶음이 4GB를 넘는다/,
  );
  assert.equal(wrote, 0, "거절은 헤더를 보내기 전이어야 한다");
});

test("디렉터리는 담지 않는다", async (t) => {
  const { dir, cleanup } = await workspace();
  t.after(cleanup);
  assert.ok(statSync(dir).isDirectory());
  await assert.rejects(
    () => toFile(dir, [{ path: dir, name: "dir" }]),
    /파일이 아니다/,
  );
});
