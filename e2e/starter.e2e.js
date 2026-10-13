// Detox smoke test — launches the app and asserts the root renders.
describe('Sano Bir', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should launch without crashing', async () => {
    await expect(element(by.id('app-root'))).toBeVisible();
  });
});
