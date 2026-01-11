declare module "virtual:mirrorstate/initial-states" {
  export const INITIAL_STATES: Record<string, any> | undefined;
  export const STATES_HASH: string;
}

declare module "virtual:mirrorstate/config" {
  export const WS_PATH: string;
}
