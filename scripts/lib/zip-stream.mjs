// 저장(무압축) ZIP을 직접 만들어 스트리밍한다.
// 왜: 예전에는 시스템 `zip -j -0` 을 띄웠는데 Windows에는 그 명령이 없다.
// MP4·PNG는 이미 압축돼 있어 저장 방식이면 충분하므로, 외부 명령 없이 형식만 맞춘다.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { crc32 } from "node:zlib";

const LOCAL = 0x04034b50;
const DESCRIPTOR = 0x08074b50;
const CENTRAL = 0x02014b50;
const END = 0x06054b50;
// 이름은 UTF-8(0x800), 크기·CRC는 데이터 뒤의 서술자에 쓴다(0x08) — 한 번만 읽고 흘려보내기 위해서다.
const FLAGS = 0x0800 | 0x08;
const MAX = 0xffffffff; // ZIP64 없이 담을 수 있는 크기 — 한 파일도, 묶음 전체도 이 안이어야 한다

const dosTime = (date) => {
  const year = Math.max(1980, date.getFullYear());
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      (Math.floor(date.getSeconds() / 2) & 0x1f),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
};

const localHeader = (name, { time, date }) => {
  const raw = Buffer.from(name, "utf8");
  const head = Buffer.alloc(30);
  head.writeUInt32LE(LOCAL, 0);
  head.writeUInt16LE(20, 4); // 풀기에 필요한 버전
  head.writeUInt16LE(FLAGS, 6);
  head.writeUInt16LE(0, 8); // 저장
  head.writeUInt16LE(time, 10);
  head.writeUInt16LE(date, 12);
  head.writeUInt16LE(raw.length, 26);
  return Buffer.concat([head, raw]);
};

const descriptor = (sum, size) => {
  const buf = Buffer.alloc(16);
  buf.writeUInt32LE(DESCRIPTOR, 0);
  buf.writeUInt32LE(sum, 4);
  buf.writeUInt32LE(size, 8);
  buf.writeUInt32LE(size, 12);
  return buf;
};

const centralHeader = (entry) => {
  const raw = Buffer.from(entry.name, "utf8");
  const head = Buffer.alloc(46);
  head.writeUInt32LE(CENTRAL, 0);
  head.writeUInt16LE(20, 4); // 만든 버전
  head.writeUInt16LE(20, 6);
  head.writeUInt16LE(FLAGS, 8);
  head.writeUInt16LE(0, 10);
  head.writeUInt16LE(entry.time, 12);
  head.writeUInt16LE(entry.date, 14);
  head.writeUInt32LE(entry.crc, 16);
  head.writeUInt32LE(entry.size, 20);
  head.writeUInt32LE(entry.size, 24);
  head.writeUInt16LE(raw.length, 28);
  head.writeUInt32LE(entry.offset, 42);
  return Buffer.concat([head, raw]);
};

const endRecord = (count, size, offset) => {
  const buf = Buffer.alloc(22);
  buf.writeUInt32LE(END, 0);
  buf.writeUInt16LE(count, 8);
  buf.writeUInt16LE(count, 10);
  buf.writeUInt32LE(size, 12);
  buf.writeUInt32LE(offset, 16);
  return buf;
};

// 받는 쪽이 중간에 끊기면 drain 이 영영 오지 않으므로 기다리지 않고 끝낸다.
const put = (out, chunk) => {
  if (out.destroyed || out.writableEnded)
    return Promise.reject(new Error("받는 쪽이 끊겼다"));
  if (out.write(chunk)) return Promise.resolve();
  return new Promise((done, fail) => {
    const stop = () => {
      out.off("drain", go);
      fail(new Error("받는 쪽이 끊겼다"));
    };
    const go = () => {
      out.off("close", stop);
      out.off("error", stop);
      done();
    };
    out.once("drain", go);
    out.once("close", stop);
    out.once("error", stop);
  });
};

/**
 * `entries`(= [{ path, name }])를 저장 방식 ZIP으로 `out`에 쓴다.
 * 파일은 각각 한 번만 읽으며, 4GB 이상이면 ZIP64가 필요하므로 거절한다.
 * 스트림은 닫지 않는다 — 호출한 쪽이 끝을 정한다.
 */
export async function writeZip(out, entries) {
  // 크기는 먼저 전부 확인한다. 중간에 걸리면 헤더를 보낸 뒤라 받는 쪽엔 «끊김»으로만 보인다.
  const sized = [];
  let planned = 0;
  for (const { path, name } of entries) {
    const info = await stat(path);
    if (!info.isFile()) throw new Error("파일이 아니다: " + path);
    if (info.size > MAX) throw new Error("4GB 이상은 담을 수 없다: " + path);
    planned += info.size + 30 + Buffer.byteLength(name, "utf8") + 16;
    sized.push({ path, name, info });
  }
  if (planned > MAX)
    throw new Error(`묶음이 4GB를 넘는다(${planned}바이트) — 파일을 나눠 받는다`);

  const central = [];
  let offset = 0;
  for (const { path, name, info } of sized) {
    const when = dosTime(info.mtime);
    const head = localHeader(name, when);
    await put(out, head);
    let size = 0;
    let sum = 0;
    for await (const chunk of createReadStream(path)) {
      size += chunk.length;
      sum = crc32(chunk, sum);
      await put(out, chunk);
    }
    if (size !== info.size)
      throw new Error("읽는 동안 파일 크기가 바뀌었다: " + path);
    await put(out, descriptor(sum, size));
    central.push({ name, crc: sum, size, offset, ...when });
    offset += head.length + size + 16;
  }
  const directory = Buffer.concat(central.map(centralHeader));
  await put(out, directory);
  await put(out, endRecord(central.length, directory.length, offset));
}
