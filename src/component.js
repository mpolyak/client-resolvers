const React = require("react");

const {
    addResolvers,
    removeResolvers,
} = require("./resolvers.js");

exports.clientResolvers = function(resolvers) {
    return function(WrappedComponent) {
        return class extends React.Component {
            componentWillMount() {
                this._resolvers = addResolvers(resolvers);
            }

            componentWillUnmount() {
                removeResolvers(this._resolvers);
            }

            render() {
                return React.createElement(WrappedComponent, this.props);
            }
        };
    };
};
