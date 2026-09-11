export const BRAND = {
  name: "Nina",
  title: "NINA",
  monogram: "N",
} as const;

export const COPY = {
  start: "Start",
  continue: "Continue",
  daily: `Today on ${BRAND.title}`,
  win: `Filed in ${BRAND.title}`,
  firstBoard: `This is ${BRAND.name}'s board.`,
  welcome: `Welcome to ${BRAND.title}.`,
  welcomeBack: "Welcome back.",
} as const;
