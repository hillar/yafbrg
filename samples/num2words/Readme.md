```


# yafbrg/samples/num2words main % node ../../src/yafbrg.mjs src/routes


[
	0 => Object
	{
		orig => '/[num]',
		route => '/',
		keys => Array
		[
			0 => 'num'
		],
		pattern => /^\/([^/]+?)\/?$/i,
		mts => 'src/routes/[num].mts',
		imports => Object
		{
			../services/n2w.mjs => Array
			[
				0 => 'convertNumberToWordsEN'
			]
		},
		schemas => Object

		},
		methods => Array
		[
			0 => Object
			{
				name => 'get',
				type => 'string',
				parameters => Array
				[
					0 => Object
					{
						name => 'n',
						type => 'number',
						required => true
					}
				],
				jsDoc => undefined
			}
		],
		compiledFilename => '.build/routes/[num].mjs',
		functions => Object
		{
			get => 'function get(n) {
    return convertNumberToWordsEN(n);
}'
		}
	},
	1 => Object
	{
		orig => '/',
		route => '/',
		keys => Array

		],
		pattern => /^\/?$/i,
		mts => 'src/routes/index.mts',
		imports => Object
		{
			../services/n2w.mjs => Array
			[
				0 => 'convertNumberToWordsEN'
			],
			../services/index.mjs => Array
			[
				0 => 'convertSquareConfig',
				1 => 'LabeledSquareConfig',
				2 => 'SquareConfig',
				3 => 'LabeledValue'
			]
		},
		schemas => Object
		{
			LabeledValue => Object
			{
				properties => Object
				{
					label => Object
					{
						title => 'LabeledValue.label',
						type => 'string'
					}
				},
				required => Array
				[
					0 => 'label'
				],
				additionalProperties => false,
				title => 'LabeledValue',
				type => 'object'
			},
			SquareConfig => Object
			{
				properties => Object
				{
					color => Object
					{
						title => 'SquareConfig.color',
						type => 'string'
					},
					width => Object
					{
						title => 'SquareConfig.width',
						type => 'number'
					}
				},
				additionalProperties => false,
				title => 'SquareConfig',
				type => 'object'
			},
			LabeledSquareConfig => Object
			{
				properties => Object
				{
					color => Object
					{
						title => 'LabeledSquareConfig.color',
						type => 'string'
					},
					width => Object
					{
						title => 'LabeledSquareConfig.width',
						type => 'number'
					},
					label => Object
					{
						$ref => '#/components/schemas/LabeledValue',
						title => 'LabeledSquareConfig.label'
					}
				},
				required => Array
				[
					0 => 'label'
				],
				additionalProperties => false,
				title => 'LabeledSquareConfig',
				type => 'object'
			}
		},
		methods => Array
		[
			0 => Object
			{
				name => 'get',
				type => 'string',
				parameters => Array
				[
					0 => Object
					{
						name => 'n',
						type => 'number',
						required => true
					}
				],
				jsDoc => undefined
			},
			1 => Object
			{
				name => 'post',
				type => 'LabeledSquareConfig',
				parameters => Array
				[
					0 => Object
					{
						name => 'sq',
						type => 'SquareConfig',
						required => true
					},
					1 => Object
					{
						name => 'l',
						type => 'LabeledValue',
						required => true
					}
				],
				jsDoc => Array
				[
					0 => 'kala asadc'
				]
			}
		],
		compiledFilename => '.build/routes/index.mjs',
		functions => Object
		{
			get => 'function get(n) {
    return convertNumberToWordsEN(n);
}',
			post => 'function post(sq, l) {
    return convertSquareConfig(sq, l);
}'
		}
	},
	2 => Object
	{
		orig => '/[kala]/maja/:kana',
		route => '/',
		keys => Array
		[
			0 => 'kala',
			1 => 'kana'
		],
		pattern => /^\/([^/]+?)\/maja\/([^/]+?)\/?$/i,
		mts => 'src/routes/[kala]/maja/:kana.mts',
		imports => Object
		{
			../../../services/n2w.mjs => Array
			[
				0 => 'convertNumberToWordsEN'
			],
			../../../services/index.mjs => Array
			[
				0 => 'convertSquareConfig',
				1 => 'LabeledSquareConfig',
				2 => 'SquareConfig',
				3 => 'LabeledValue'
			]
		},
		schemas => Object
		{
			LabeledValue => Object
			{
				properties => Object
				{
					label => Object
					{
						title => 'LabeledValue.label',
						type => 'string'
					}
				},
				required => Array
				[
					0 => 'label'
				],
				additionalProperties => false,
				title => 'LabeledValue',
				type => 'object'
			},
			SquareConfig => Object
			{
				properties => Object
				{
					color => Object
					{
						title => 'SquareConfig.color',
						type => 'string'
					},
					width => Object
					{
						title => 'SquareConfig.width',
						type => 'number'
					}
				},
				additionalProperties => false,
				title => 'SquareConfig',
				type => 'object'
			},
			LabeledSquareConfig => Object
			{
				properties => Object
				{
					color => Object
					{
						title => 'LabeledSquareConfig.color',
						type => 'string'
					},
					width => Object
					{
						title => 'LabeledSquareConfig.width',
						type => 'number'
					},
					label => Object
					{
						$ref => '#/components/schemas/LabeledValue',
						title => 'LabeledSquareConfig.label'
					}
				},
				required => Array
				[
					0 => 'label'
				],
				additionalProperties => false,
				title => 'LabeledSquareConfig',
				type => 'object'
			}
		},
		methods => Array
		[
			0 => Object
			{
				name => 'get',
				type => 'string',
				parameters => Array
				[
					0 => Object
					{
						name => 'n',
						type => 'number',
						required => true
					}
				],
				jsDoc => undefined
			},
			1 => Object
			{
				name => 'post',
				type => 'LabeledSquareConfig',
				parameters => Array
				[
					0 => Object
					{
						name => 'sq',
						type => 'SquareConfig',
						required => true
					},
					1 => Object
					{
						name => 'l',
						type => 'LabeledValue',
						required => true
					}
				],
				jsDoc => Array
				[
					0 => 'kala asadc'
				]
			}
		],
		compiledFilename => '.build/routes/[kala]/maja/:kana.mjs',
		functions => Object
		{
			get => 'function get(n) {
    return convertNumberToWordsEN(n);
}',
			post => 'async function post(sq, l) {
    return convertSquareConfig(sq, l);
}'
		}
	},
	3 => Object
	{
		orig => '/[kala]/maja/',
		route => '/',
		keys => Array
		[
			0 => 'kala'
		],
		pattern => /^\/([^/]+?)\/maja\/?$/i,
		mts => 'src/routes/[kala]/maja/index.mts',
		imports => Object
		{
			../../../services/n2w.mjs => Array
			[
				0 => 'convertNumberToWordsEN'
			]
		},
		schemas => Object

		},
		methods => Array
		[
			0 => Object
			{
				name => 'get',
				type => 'string',
				parameters => Array
				[
					0 => Object
					{
						name => 'n',
						type => 'number',
						required => true
					}
				],
				jsDoc => undefined
			}
		],
		compiledFilename => '.build/routes/[kala]/maja/index.mjs',
		functions => Object
		{
			get => 'function get(n) {
    return convertNumberToWordsEN(n);
}'
		}
	}
]

```
