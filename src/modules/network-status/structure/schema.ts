import { formatUtcSeconds } from '../format';
import { readCbor, type CborItem } from './cbor';

/**
 * Every element of a unicity certificate or an inclusion proof, named from the wire layout
 * the state-transition SDK (3.0.1) decodes. Anything the layout does not expect is still
 * shown, unnamed, with what was expected instead.
 */

export interface StructureNode {
  /** `[3]` for an array position, the key text for a map entry. */
  readonly label: string | null;
  /** The field's name in the wire layout, e.g. `roundNumber`. */
  readonly name: string | null;
  /** `uint`, `bytes(32)`, `null`, `tag 39002 · array(10)`, `map(4)`, `fault`… */
  readonly type: string;
  /** Decimal, full lowercase hex, or text; `null` for containers and null values. */
  readonly value: string | null;
  /** The hex to copy, for a non-empty byte string. */
  readonly copy: string | null;
  /** A readable reading of the value: a UTC time, a network name, shard bits. */
  readonly note: string | null;
  readonly mismatch: string | null;
  readonly offset: number;
  readonly length: number;
  readonly children: readonly StructureNode[];
}

export interface StructureView {
  readonly root: StructureNode | null;
  readonly size: number;
  readonly trailing: number;
  /** Nodes with a mismatch or fault, plus one for trailing bytes. */
  readonly mismatches: number;
}

type Spec =
  | { readonly kind: 'uint'; readonly interpret?: 'utc-seconds' | 'network' }
  | { readonly kind: 'bytes'; readonly size?: number; readonly interpret?: 'shard' }
  | { readonly kind: 'text' }
  | {
      readonly kind: 'record';
      readonly title: string;
      readonly tag: bigint | null;
      readonly fields: readonly Field[];
      /** Fields that must be all present or all null. */
      readonly together?: readonly string[];
    }
  | { readonly kind: 'list'; readonly of: Spec }
  | { readonly kind: 'map'; readonly key: Spec; readonly value: Spec };

interface Field {
  readonly name: string;
  readonly spec: Spec;
  readonly nullable?: boolean;
  /** For a version field: the only value the SDK accepts. */
  readonly version?: bigint;
}

const UINT: Spec = { kind: 'uint' };
const BYTES: Spec = { kind: 'bytes' };
const HASH: Spec = { kind: 'bytes', size: 32 };
const UTC: Spec = { kind: 'uint', interpret: 'utc-seconds' };
const version = (value: bigint): Field => ({ name: 'version', spec: UINT, version: value });
const field = (name: string, spec: Spec, nullable = false): Field => ({ name, spec, nullable });

const INPUT_RECORD: Spec = {
  kind: 'record',
  title: 'InputRecord',
  tag: 39002n,
  fields: [
    version(1n),
    field('roundNumber', UINT),
    field('epoch', UINT),
    field('previousHash', HASH, true),
    field('hash', HASH),
    field('summaryValue', BYTES),
    field('timestamp', UTC),
    field('blockHash', HASH, true),
    field('sumOfEarnedFees', UINT),
    field('executedTransactionsHash', HASH, true),
  ],
};

const SHARD_TREE_CERTIFICATE: Spec = {
  kind: 'record',
  title: 'ShardTreeCertificate',
  tag: 39003n,
  fields: [version(1n), field('shard', { kind: 'bytes', interpret: 'shard' }), field('siblingHashList', { kind: 'list', of: HASH })],
};

const UNICITY_TREE_CERTIFICATE: Spec = {
  kind: 'record',
  title: 'UnicityTreeCertificate',
  tag: 39004n,
  fields: [
    version(1n),
    field('partitionIdentifier', UINT),
    field('steps', { kind: 'list', of: { kind: 'record', title: 'HashStep', tag: null, fields: [field('key', UINT), field('hash', HASH)] } }),
  ],
};

const UNICITY_SEAL: Spec = {
  kind: 'record',
  title: 'UnicitySeal',
  tag: 39005n,
  fields: [
    version(1n),
    field('networkId', { kind: 'uint', interpret: 'network' }),
    field('rootChainRoundNumber', UINT),
    field('epoch', UINT),
    field('timestamp', UTC),
    field('previousHash', HASH, true),
    field('hash', HASH),
    field('signatures', { kind: 'map', key: { kind: 'text' }, value: { kind: 'bytes', size: 65 } }),
  ],
};

const UNICITY_CERTIFICATE: Spec = {
  kind: 'record',
  title: 'UnicityCertificate',
  tag: 39001n,
  fields: [
    version(1n),
    field('inputRecord', INPUT_RECORD),
    field('technicalRecordHash', HASH, true),
    field('shardConfigurationHash', HASH),
    field('shardTreeCertificate', SHARD_TREE_CERTIFICATE),
    field('unicityTreeCertificate', UNICITY_TREE_CERTIFICATE),
    field('unicitySeal', UNICITY_SEAL),
  ],
};

const ENCODED_PREDICATE: Spec = {
  kind: 'record',
  title: 'EncodedPredicate',
  tag: 39032n,
  fields: [field('engine', UINT), field('code', BYTES), field('parameters', BYTES)],
};

const CERTIFICATION_DATA: Spec = {
  kind: 'record',
  title: 'CertificationData',
  tag: 39031n,
  fields: [
    version(2n),
    field('lockScript', ENCODED_PREDICATE),
    field('sourceStateHash', HASH),
    field('transactionHash', HASH),
    field('expiresAt', UTC, true),
    field('unlockScript', BYTES),
  ],
};

const INCLUSION_PROOF: Spec = {
  kind: 'record',
  title: 'InclusionProof',
  tag: 39033n,
  fields: [
    version(1n),
    field('certificationData', CERTIFICATION_DATA, true),
    field('referenceTime', UTC, true),
    field('inclusionCertificate', BYTES, true),
    field('unicityCertificate', UNICITY_CERTIFICATE),
  ],
  // A certified leaf carries all three; a state not (yet) in the tree, none.
  together: ['certificationData', 'referenceTime', 'inclusionCertificate'],
};

const INCLUSION_PROOF_RESPONSE: Spec = {
  kind: 'record',
  title: 'InclusionProofResponse',
  tag: null,
  fields: [field('blockNumber', UINT), field('inclusionProof', INCLUSION_PROOF)],
};

const NETWORKS: Record<string, string> = { '1': 'mainnet', '4': 'testnet2' };

/** A block's unicity certificate (hex CBOR, tag 39001). */
export function certificateStructure(hex: string): StructureView {
  return structure(hex, UNICITY_CERTIFICATE);
}

/** A `get_inclusion_proof.v2` answer (hex CBOR, `[blockNumber, InclusionProof]`). */
export function proofStructure(hex: string): StructureView {
  return structure(hex, INCLUSION_PROOF_RESPONSE);
}

function structure(hex: string, spec: Spec): StructureView {
  if (!/^(?:[0-9a-fA-F]{2})*$/.test(hex)) {
    const root = node({ type: 'fault', mismatch: 'not hex', offset: 0, length: 0 });
    return { root, size: 0, trailing: 0, mismatches: 1 };
  }
  const bytes = Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16));
  const doc = readCbor(bytes);
  const root = doc.root && annotate(doc.root, spec, { label: null, name: spec.kind === 'record' ? spec.title : null });
  return { root, size: doc.size, trailing: doc.trailing, mismatches: (root ? countMismatches(root) : 0) + (doc.trailing > 0 ? 1 : 0) };
}

interface Place {
  readonly label: string | null;
  readonly name: string | null;
  readonly nullable?: boolean;
  readonly version?: bigint;
}

function annotate(item: CborItem, spec: Spec, place: Place): StructureNode {
  if (item.kind === 'fault') return generic(item, place);
  if (item.kind === 'simple' && item.value === null && place.nullable) return generic(item, place);

  switch (spec.kind) {
    case 'uint': {
      if (item.kind !== 'uint') break;
      const value = item.value.toString();
      const mismatch = place.version !== undefined && item.value !== place.version ? `expected version ${place.version}, got ${value}` : null;
      return { ...generic(item, place), mismatch, note: uintNote(value, spec.interpret) };
    }
    case 'bytes': {
      if (item.kind !== 'bytes') break;
      const base = generic(item, place);
      const sizeMismatch = spec.size !== undefined && item.value.length !== spec.size ? `expected ${spec.size} bytes, got ${item.value.length}` : null;
      if (spec.interpret !== 'shard') return { ...base, mismatch: sizeMismatch };
      const bits = shardBits(item.value);
      return { ...base, note: bits === null ? null : bits === '' ? 'single shard' : `shard ${bits}`, mismatch: sizeMismatch ?? (bits === null ? 'no end marker' : null) };
    }
    case 'text':
      if (item.kind !== 'text') break;
      return generic(item, place);
    case 'record':
      return record(item, spec, place);
    case 'list': {
      if (item.kind !== 'array') break;
      const childName = spec.of.kind === 'record' ? spec.of.title : null;
      return { ...generic(item, place), children: item.items.map((child, i) => annotate(child, spec.of, { label: `[${i}]`, name: childName })) };
    }
    case 'map': {
      if (item.kind !== 'map') break;
      // Key and value each get a row, in wire order, so every byte of the map is in a row.
      const children = item.entries.flatMap(({ key, value }) =>
        key.kind === 'fault'
          ? [generic(key, { label: 'key', name: null })]
          : [annotate(key, spec.key, { label: 'key', name: null }), annotate(value, spec.value, { label: keyLabel(key), name: null })],
      );
      return { ...generic(item, place), children };
    }
  }
  return { ...generic(item, place), mismatch: `expected ${expected(spec, place.nullable ?? false)}, got ${typeOf(item)}` };
}

function record(item: CborItem, spec: Extract<Spec, { kind: 'record' }>, place: Place): StructureNode {
  let array: CborItem = item;
  if (spec.tag !== null) {
    if (item.kind !== 'tag') return { ...generic(item, place), mismatch: `expected tag ${spec.tag}, got ${typeOf(item)}` };
    if (item.tag !== spec.tag) return { ...generic(item, place), mismatch: `expected tag ${spec.tag}, got tag ${item.tag}` };
    array = item.item;
  }
  if (array.kind !== 'array') {
    return { ...generic(item, place), mismatch: array.kind === 'fault' ? null : `expected array, got ${typeOf(array)}` };
  }
  const children = array.items.map((child, i) => {
    const f = spec.fields[i];
    if (!f) return { ...generic(child, { label: `[${i}]`, name: null }), mismatch: child.kind === 'fault' ? child.message : 'not in the schema' };
    return annotate(child, f.spec, { label: `[${i}]`, name: f.name, nullable: f.nullable, version: f.version });
  });
  // Fields the header declares but the input ended before, apart from fields the header leaves out.
  const declared = array.declared < BigInt(spec.fields.length) ? Number(array.declared) : spec.fields.length;
  const notRead = spec.fields.slice(array.items.length, declared).map((f) => f.name);
  const missing = spec.fields.slice(declared).map((f) => f.name);
  const problems = [
    notRead.length ? `not read: the input ends before ${notRead.join(', ')}` : null,
    missing.length ? `missing ${missing.join(', ')}` : null,
    spec.together ? togetherProblem(spec.together, children) : null,
  ].filter((p) => p !== null);
  return { ...generic(item, place), children, mismatch: problems.length ? problems.join('; ') : null };
}

function togetherProblem(names: readonly string[], children: readonly StructureNode[]): string | null {
  const fields = names.map((name) => children.find((c) => c.name === name));
  if (fields.some((f) => f === undefined || f.type === 'fault')) return null;
  const nulls = fields.filter((f) => f!.type === 'null').length;
  if (nulls === 0 || nulls === fields.length) return null;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} must be all present or all null`;
}

/** The item as it is, with no layout applied. */
function generic(item: CborItem, place: Place): StructureNode {
  const at = { label: place.label, name: place.name, offset: item.offset, length: item.length, type: typeOf(item) };
  switch (item.kind) {
    case 'uint':
    case 'nint':
      return node({ ...at, value: item.value.toString() });
    case 'bytes': {
      const hex = toHex(item.value);
      return node({ ...at, value: hex || '(empty)', copy: hex || null });
    }
    case 'text':
      return node({ ...at, value: item.value });
    case 'float':
      return node({ ...at, value: String(item.value) });
    case 'simple':
      return node({ ...at, value: item.value === null ? null : String(item.value) });
    case 'fault':
      return node({ ...at, mismatch: item.message });
    case 'array':
      return node({ ...at, children: item.items.map((child, i) => generic(child, { label: `[${i}]`, name: null })) });
    case 'map':
      return node({
        ...at,
        children: item.entries.flatMap(({ key, value }) =>
          key.kind === 'fault'
            ? [generic(key, { label: 'key', name: null })]
            : [generic(key, { label: 'key', name: null }), generic(value, { label: keyLabel(key), name: null })],
        ),
      });
    case 'tag':
      return node({
        ...at,
        children: item.item.kind === 'array' ? generic(item.item, place).children : [generic(item.item, { label: null, name: null })],
      });
  }
}

function node(fields: Partial<StructureNode> & Pick<StructureNode, 'type' | 'offset' | 'length'>): StructureNode {
  return { label: null, name: null, value: null, copy: null, note: null, mismatch: null, children: [], ...fields };
}

function typeOf(item: CborItem): string {
  switch (item.kind) {
    case 'bytes':
      return `bytes(${item.value.length})`;
    case 'array':
      return `array(${item.declared})`;
    case 'map':
      return `map(${item.declared})`;
    case 'tag':
      return item.item.kind === 'array' ? `tag ${item.tag} · ${typeOf(item.item)}` : `tag ${item.tag}`;
    case 'simple':
      return item.value === null ? 'null' : item.value === undefined ? 'undefined' : typeof item.value === 'boolean' ? 'bool' : 'simple';
    default:
      return item.kind;
  }
}

function expected(spec: Spec, nullable: boolean): string {
  const base =
    spec.kind === 'bytes'
      ? spec.size === undefined
        ? 'bytes'
        : `bytes(${spec.size})`
      : spec.kind === 'record'
        ? spec.tag === null
          ? 'array'
          : `tag ${spec.tag}`
        : spec.kind === 'list'
          ? 'array'
          : spec.kind;
  return nullable ? `${base} or null` : base;
}

/** The label of a map value: its key, when the key is text or an integer. */
function keyLabel(key: CborItem): string {
  return key.kind === 'text' ? key.value : key.kind === 'uint' || key.kind === 'nint' ? key.value.toString() : 'value';
}

function uintNote(value: string, interpret: 'utc-seconds' | 'network' | undefined): string | null {
  if (interpret === 'network') return NETWORKS[value] ?? 'unknown network';
  if (interpret === 'utc-seconds') {
    const time = formatUtcSeconds(value);
    return time === value ? null : time;
  }
  return null;
}

/**
 * A shard id's bits: the bits before the end marker, the last 1 bit, which must be in the
 * last byte (as `ShardId.decode` requires); `null` without one.
 */
function shardBits(bytes: Uint8Array): string | null {
  if (bytes.length === 0 || bytes[bytes.length - 1] === 0) return null;
  const bits = Array.from(bytes, (b) => b.toString(2).padStart(8, '0')).join('');
  const end = bits.lastIndexOf('1');
  return end === -1 ? null : bits.slice(0, end);
}

function countMismatches(n: StructureNode): number {
  return (n.mismatch ? 1 : 0) + n.children.reduce((sum, child) => sum + countMismatches(child), 0);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
