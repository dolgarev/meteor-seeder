var fallbackFaker = {
	forString: function (field) {
		var str = faker.lorem.sentence();
		return validatedData.get(field, str);
	},
	forNumber: function (field) {
		var max = field.max || 1000,
			min = field.min || 1;

		return _.random(min, max);
	},
	forBoolean: function () {
		return (_.random(1, 1000) % 2) == 0;
	},
	generate: function (field, type) {
		// some fallbacks in case seeder is not set.
		if (_.isString(type)) {
			return this.forString(field);
		}

		if (_.isNumber(type)) {
			return this.forNumber(field);
		}

		if (_.isBoolean(type)) {
			return this.forBoolean();
		}

		if (_.isDate(type)) {
			return faker.date.past();
		}

		return null;
	}
};

var validatedData = {
	forString: function (field, str) {
		if (field.max)
			return str.substr(0, field.max-1);

		return str;
	},
	get: function (field, data) {
		if (_.isString(data))
			return this.forString(field, data);

		return data;
	}
};

Seeder = function (config) {
	var schema = null;

	var options = _.extend({
		collection: null,
		total: 1
	}, config);

	if (!(options.collection instanceof Mongo.Collection) || !_.isFunction(options.collection.simpleSchema)) {
		throw new Meteor.Error('Seeder config error', 'config Must contain a valid mongo collection');
	}

	schema = options.collection.simpleSchema();
	if (!schema || !_.isFunction(schema.schema)) {
		throw new Meteor.Error('Seeder config error', 'collection does not have a valid SimpleSchema');
	}

	schema = schema.schema();

	// From StackOverflow - http://stackoverflow.com/a/22129960/1079478
	function getFaker (method, safe) {
	    return method.split('.').reduce(function(prev, curr) {
	        return !safe ? prev[curr] : (prev ? prev[curr] : undefined)
	    }, faker || self);
	}

	function dataFor (name) {
		var field = schema[name],
			type = new field.type;

		if (_.has(field, 'seeder')){
			var data = getFaker(field.seeder, true)();
			return validatedData.get(field, data);
		}

		if (_.isArray(type)) {
			var data = [],
				realType = new schema[name +'.$'].type,
				max = field.maxCount || _.random(2, 10),
				min = field.minCount || 1;

			if (min > max)
				max = min + 1;

			_(_.random(min, max)).times(function () {
				data.push(fallbackFaker.generate(field, realType));
			});

			return data;
		}

		return fallbackFaker.generate(field, type);
	}

	_(options.total).times(function (n) {
		var data = {};
		_.each(_.keys(schema), function (property) {
			if (property.indexOf('.$') > 0)
				return;

			data[property] = dataFor(property);
		});

		// console.log(data);
		options.collection.insert(data);
	});
};

SimpleSchema.extendOptions({
	seeder: Match.Optional(String)
});