import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';

class SecurityWorld extends World {
  public baseUrl = 'http://localhost:8080';
  public currentVulnerability: any = null;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(SecurityWorld);
