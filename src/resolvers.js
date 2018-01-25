let _resolvers = {};
let _proxy;

/**
 * Emulate native object Proxy mechanism by varying the dynamic resolvers map
 * prototype.
 *
 * This results in all object references to `_proxy` to have current resolvers
 * appear as object properties.
 *
 * However this mechanism comes at a significant performance cost:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/setPrototypeOf
 */
function _updateResolversProxy() {
    if (!_proxy) {
        _proxy = {};
    }

    let proto = {};

    for (let resolvers of Object.values(_resolvers)) {
        for (let type of Object.keys(resolvers)) {
            proto[type] = Object.assign(proto[type] || {}, resolvers[type]);
        }
    }

    Object.setPrototypeOf(_proxy, proto);
}

/**
 * Add types fields resolvers to map.
 */
exports.addResolvers = function(resolvers) {
    const id = Math.random().toString(26).slice(2);

    _resolvers[id] = resolvers;

    if (typeof Proxy !== "function") {
        _updateResolversProxy();
    }

    return id;
};

/**
 * Remove types fields resolvers from map.
 */
exports.removeResolvers = function(id) {
    delete _resolvers[id];

    if (typeof Proxy !== "function") {
        _updateResolversProxy();
    }
};

/**
 * Used by tests to reset state.
 */
exports.clearResolvers = function() {
    _resolvers = {};

    // Note that this does not clear existing references to dynamic resolvers.
    _proxy = undefined;
};

/**
 * Return a singleton object representing the dynamic resolvers map.
 */
exports.getProxyResolvers = function() {
    if (_proxy) {
        return _proxy;
    }

    if (typeof Proxy === "function") {
        _proxy = new Proxy({}, {
            get(_, type) {
                let fields;

                for (let resolvers of Object.values(_resolvers)) {
                    if (resolvers.hasOwnProperty(type)) {
                        fields = Object.assign(fields || {}, resolvers[type]);
                    }
                }

                return fields;
            }
        });
    } else {
        _proxy = {};
    }

    return _proxy;
};
