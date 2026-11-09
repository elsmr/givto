import { BlockList, isIP } from 'node:net';

// Everything that isn't public unicast (39 SSRF): private, loopback, link-local (incl. the
// 169.254.169.254 metadata address), CGNAT, documentation, multicast and reserved ranges.
// Separate lists: a BlockList also matches IPv4 addresses against IPv6 rules like ::/96.
const blockedIpv4 = new BlockList();
const blockedIpv6 = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blockedIpv4.addSubnet(network, prefix, 'ipv4');
}
// Blocked whole: IPv6 forms that embed an IPv4 address (mapped, compatible, NAT64, 6to4),
// so a private IPv4 can't hide inside one. Public sites don't resolve to these.
for (const [network, prefix] of [
  ['::', 96],
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
] as const) {
  blockedIpv6.addSubnet(network, prefix, 'ipv6');
}

/** True for anything we must never connect to. Unparseable input counts as blocked. */
export const isBlockedAddress = (address: string): boolean => {
  const bare = address.replace(/^\[|\]$/g, '');
  const version = isIP(bare);
  if (version === 4) return blockedIpv4.check(bare, 'ipv4');
  if (version === 6) return blockedIpv6.check(bare, 'ipv6');
  return true;
};
