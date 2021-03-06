import completeMixin from '../complete';
import expect from 'expect.js';
import sinon from 'sinon';

/* eslint-disable import/no-duplicates */
import * as transformDeprecationsNS from '../transform_deprecations';
import { transformDeprecations } from '../transform_deprecations';
/* eslint-enable import/no-duplicates */

describe('server/config completeMixin()', function () {
  const sandbox = sinon.sandbox.create();
  afterEach(() => sandbox.restore());

  const setup = (options = {}) => {
    const {
      settings = {},
      configValues = {}
    } = options;

    const server = {
      decorate: sinon.stub()
    };

    const config = {
      get: sinon.stub().returns(configValues)
    };

    const kbnServer = {
      settings,
      server,
      config
    };

    const callCompleteMixin = () => {
      completeMixin(kbnServer, server, config);
    };

    return { config, callCompleteMixin, server };
  };

  describe('server decoration', () => {
    it('adds a config() function to the server', () => {
      const { config, callCompleteMixin, server } = setup({
        settings: {},
        configValues: {}
      });

      callCompleteMixin();
      sinon.assert.calledOnce(server.decorate);
      sinon.assert.calledWith(server.decorate, 'server', 'config', sinon.match.func);
      expect(server.decorate.firstCall.args[2]()).to.be(config);
    });
  });

  describe('all settings used', () => {
    it('should not throw', function () {
      const { callCompleteMixin } = setup({
        settings: {
          used: true
        },
        configValues: {
          used: true
        },
      });

      callCompleteMixin();
    });

    describe('more config values than settings', () => {
      it('should not throw', function () {
        const { callCompleteMixin } = setup({
          settings: {
            used: true
          },
          configValues: {
            used: true,
            foo: 'bar'
          }
        });

        callCompleteMixin();
      });
    });
  });

  describe('env setting specified', () => {
    it('should not throw', () => {
      const { callCompleteMixin } = setup({
        settings: {
          env: 'development'
        },
        configValues: {
          env: {
            name: 'development'
          }
        }
      });

      callCompleteMixin();
    });
  });

  describe('settings include non-default array settings', () => {
    it('should not throw', () => {
      const { callCompleteMixin } = setup({
        settings: {
          foo: [
            'a',
            'b'
          ]
        },
        configValues: {
          foo: []
        }
      });

      callCompleteMixin();
    });
  });

  describe('some settings unused', () => {
    it('should throw an error', function () {
      const { callCompleteMixin } = setup({
        settings: {
          unused: true
        },
        configValues: {
          used: true
        }
      });

      expect(callCompleteMixin).to.throwError('"unused" not applied');
    });

    describe('error thrown', () => {
      it('has correct code, processExitCode, and message', () => {
        const { callCompleteMixin } = setup({
          settings: {
            unused: true,
            foo: 'bar',
            namespace: {
              with: {
                sub: {
                  keys: true
                }
              }
            }
          }
        });

        expect(callCompleteMixin).to.throwError((error) => {
          expect(error).to.have.property('code', 'InvalidConfig');
          expect(error).to.have.property('processExitCode', 64);
          expect(error.message).to.contain('"unused", "foo", and "namespace.with.sub.keys"');
        });
      });
    });
  });

  describe('deprecation support', () => {
    it('should transform settings when determining what is unused', function () {
      sandbox.spy(transformDeprecationsNS, 'transformDeprecations');

      const settings = {
        foo: 1
      };

      const { callCompleteMixin } = setup({
        settings,
        configValues: {
          ...settings
        }
      });

      callCompleteMixin();
      sinon.assert.calledOnce(transformDeprecations);
      sinon.assert.calledWithExactly(transformDeprecations, settings);
    });

    it('should use transformed settings when considering what is used', function () {
      sandbox.stub(transformDeprecationsNS, 'transformDeprecations', (settings) => {
        settings.bar = settings.foo;
        delete settings.foo;
        return settings;
      });

      const { callCompleteMixin } = setup({
        settings: {
          foo: 1
        },
        configValues: {
          bar: 1
        }
      });

      callCompleteMixin();
      sinon.assert.calledOnce(transformDeprecations);
    });
  });
});
