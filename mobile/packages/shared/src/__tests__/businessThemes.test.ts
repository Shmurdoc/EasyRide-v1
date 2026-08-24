import { BUSINESS_THEMES, getBusinessTheme } from '../theme/businessThemes';

describe('businessThemes', () => {
  describe('BUSINESS_THEMES', () => {
    it('has rides theme', () => {
      const rides = BUSINESS_THEMES.rides;
      expect(rides).toBeDefined();
      expect(rides.id).toBe('biz-rides');
      expect(rides.slug).toBe('rides');
      expect(rides.colors.primary).toBe('#7C3AED');
      expect(rides.logo.text).toBe('EasyRyde');
      expect(rides.branding.tagline).toBe('Your ride, your way');
    });

    it('has food theme', () => {
      const food = BUSINESS_THEMES.food;
      expect(food).toBeDefined();
      expect(food.id).toBe('biz-food');
      expect(food.slug).toBe('food');
      expect(food.colors.primary).toBe('#EA580C');
      expect(food.logo.mark).toBe('EF');
      expect(food.branding.keywords).toContain('food');
    });
  });

  describe('getBusinessTheme', () => {
    it('returns rides theme', () => {
      const result = getBusinessTheme('rides');
      expect(result.slug).toBe('rides');
    });

    it('returns food theme', () => {
      const result = getBusinessTheme('food');
      expect(result.slug).toBe('food');
    });
  });

  describe('theme structure', () => {
    it('all themes have required fields', () => {
      Object.values(BUSINESS_THEMES).forEach((theme) => {
        expect(theme.id).toBeDefined();
        expect(theme.name).toBeDefined();
        expect(theme.slug).toBeDefined();
        expect(theme.colors).toBeDefined();
        expect(theme.colors.primary).toBeDefined();
        expect(theme.colors.primaryLight).toBeDefined();
        expect(theme.colors.primaryDark).toBeDefined();
        expect(theme.colors.gradient).toHaveLength(2);
        expect(theme.colors.gradientLight).toHaveLength(3);
        expect(theme.colors.gradientDark).toHaveLength(2);
        expect(theme.logo).toBeDefined();
        expect(theme.logo.icon).toBeDefined();
        expect(theme.logo.text).toBeDefined();
        expect(theme.logo.mark).toBeDefined();
        expect(theme.branding).toBeDefined();
        expect(theme.branding.tagline).toBeDefined();
        expect(theme.branding.keywords).toBeInstanceOf(Array);
      });
    });
  });
});
