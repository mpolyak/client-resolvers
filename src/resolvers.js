let _resolvers = {};
let _proxy = {};

/**
 * Update dynamic resolver map with currently mounted resolver types and fields.
 *
 * This results in all object references to `_proxy` to have current resolvers
 * appear as object properties.
 */
function _updateResolversProxy() {
    for (let type of Object.keys(_proxy)) {
        delete _proxy[type];
    }

    for (let resolvers of Object.values(_resolvers)) {
        for (let type of Object.keys(resolvers)) {
            _proxy[type] = Object.assign(_proxy[type] || {}, resolvers[type]);
        }
    }
}

/**
 * Add types fields resolvers to map.
 */
exports.addResolvers = function(resolvers) {
    const id = Math.random().toString(26).slice(2);

    _resolvers[id] = resolvers;

    _updateResolversProxy();

    return id;
};

/**
 * Remove types fields resolvers from map.
 */
exports.removeResolvers = function(id) {
    delete _resolvers[id];

    _updateResolversProxy();
};

/**
 * Used by tests to reset state.
 */
exports.clearResolvers = function() {
    _resolvers = {};

    for (let type of Object.keys(_proxy)) {
        delete _proxy[type];
    }
};

/**
 * Return a singleton object representing the dynamic resolvers map.
 */
exports.getProxyResolvers = function() {
    return _proxy;
};
