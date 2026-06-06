
export const PubSubChannels = {
  deploymentLogs: (deploymentId: string) => `brimble:logs:${deploymentId}`,
} as const;