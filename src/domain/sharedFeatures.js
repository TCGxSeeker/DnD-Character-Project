import { getCharacterFeatures } from "./grantedContent.js";
import { effectiveExtraAttacks, firstUnarmoredDefense } from "./multiclass.js";

function classLevel(character, classId) {
  return Number(character.classLevels?.find((entry) => entry.classId === classId)?.level || 0);
}

function featureSources(character, name) {
  return getCharacterFeatures(character).filter((feature) => feature.name === name).map((feature) => feature.source);
}

export function sharedFeatureSummary(character) {
  const attacks = effectiveExtraAttacks(character);
  const extraAttackSources = featureSources(character, "Extra Attack");
  const defense = firstUnarmoredDefense(character);
  const channel = (character.resources || []).find((entry) => entry.id === "channel-divinity");
  const channelOptions = getCharacterFeatures(character).filter((feature) => feature.name.startsWith("Channel Divinity:") || feature.name === "Channel Divinity").map((feature) => ({ name: feature.name, source: feature.source }));
  return {
    extraAttack: {
      value: attacks,
      formula: attacks === 1 ? "One attack with the Attack action" : `Best Extra Attack progression grants ${attacks} attacks; grants never stack`,
      sources: extraAttackSources,
    },
    unarmoredDefense: {
      value: defense,
      formula: defense ? `${defense[0].toUpperCase()}${defense.slice(1)} was the first Unarmored Defense acquired` : "No Unarmored Defense acquired",
      sources: defense ? [`${defense} ${classLevel(character, defense)}`] : [],
    },
    channelDivinity: {
      value: channel ? Number(channel.max) : 0,
      current: channel ? Number(channel.current) : 0,
      formula: channel ? "Shared use pool; options from every granting class remain available" : "No Channel Divinity pool",
      sources: channelOptions,
    },
  };
}
