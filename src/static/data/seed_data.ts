export const ev_car_models = [
    {
        make: 'Tesla',
        models: [
            { model: 'Model S', years: [2018, 2019, 2020, 2021, 2022, 2023, 2024] },
            { model: 'Model 3', years: [2018, 2019, 2020, 2021, 2022, 2023, 2024] },
            { model: 'Model X', years: [2018, 2019, 2020, 2021, 2022, 2023, 2024] },
            { model: 'Model Y', years: [2020, 2021, 2022, 2023, 2024] }
        ]
    },
    {
        make: 'Nissan',
        models: [
            { model: 'LEAF', years: [2018, 2019, 2020, 2021, 2022, 2023, 2024] }
        ]
    },
    {
        make: 'Chevrolet',
        models: [
            { model: 'Bolt EV', years: [2018, 2019, 2020, 2021, 2022, 2023, 2024] }
        ]
    },
    {
        make: 'BMW',
        models: [
            { model: 'i3', years: [2018, 2019, 2020, 2021, 2022, 2023, 2024] }
        ]
    },
    {
        make: 'Audi',
        models: [
            { model: 'e-tron', years: [2019, 2020, 2021, 2022, 2023, 2024] }
        ]
    },
    {
        make: 'Porsche',
        models: [
            { model: 'Taycan', years: [2020, 2021, 2022, 2023, 2024] }
        ]
    },
    {
        make: 'Hyundai',
        models: [
            { model: 'Kona Electric', years: [2019, 2020, 2021, 2022, 2023, 2024] },
            { model: 'Ioniq 5', years: [2021, 2022, 2023, 2024] }
        ]
    },
    {
        make: 'Kia',
        models: [
            { model: 'Niro EV', years: [2019, 2020, 2021, 2022, 2023, 2024] },
            { model: 'EV6', years: [2022, 2023, 2024] }
        ]
    },
    {
        make: 'Jaguar',
        models: [
            { model: 'I-PACE', years: [2019, 2020, 2021, 2022, 2023, 2024] }
        ]
    }
];

export const charger_connectors = [
    {
        name: "CHAdeMO",
        description: "A common DC fast-charging connector found globally. Popular with some Asian automakers like Nissan and Mitsubishi.",
        region: "Global",
        charging_type: ["DC"],
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/chargerconnectors/chademo_dc.png"
    },
    {
        name: "J1772 TYPE 1",
        description: "The standard connector for Level 1 and Level 2 AC charging in North America. Used by the majority of EVs in the region.",
        region: "North America",
        charging_type: ["AC"],
        levels: ["Level 1", "Level 2"],
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/chargerconnectors/j1772_type1_ac.png"
    },
    {
        name: "Type 2 (Mennekes)",
        description: "The standard connector in Europe, used for both AC and DC charging.",
        region: "Europe",
        charging_type: ["AC", "DC"],
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/chargerconnectors/mennekes_type12_ac.png"
    },
    {
        name: "CCS Type 1",
        description: "This is the version of the CCS connector used in North America. It combines the J1772 (for AC charging) with additional pins for DC fast charging.",
        region: "North America",
        charging_type: ["AC", "DC"],
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/chargerconnectors/ccs1_dc.png"
    },
    {
        name: "GB/TAC",
        description: "This version handles slower AC charging, typically comparable to a Level 2 charger. GB/T AC uses the same basic 7-pin connector as the DC version.",
        region: "China",
        charging_type: ["AC"],
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/chargerconnectors/chademo_dc.png"
    },
    {
        name: "CCS Type 2",
        description: "This is the version of the CCS connector widely used in Europe. It builds upon the Type 2 (Mennekes) AC connector and adds additional pins for DC fast charging.",
        region: "Europe",
        charging_type: ["AC", "DC"],
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/chargerconnectors/ccs2_dc.png"
    },
    {
        name: "GB/T DC",
        description: "This version is specifically designed to handle high-powered DC fast charging, allowing for quick charging times. The connector shares the same basic design but handles higher voltage and amperage.",
        region: "China",
        charging_type: "DC",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/chargerconnectors/mennekes_type12_ac.png"
    },
    {
        name: "Tesla Supercharger Network",
        description: "Tesla-exclusive connector for their network of fast-charging stations. Tesla vehicles can also use J1772 and CHAdeMO connectors with adapters.",
        region: "Global",
        charging_type: ["DC"],
        compatibility: ["Tesla vehicles", "J1772 (with adapter)", "CHAdeMO (with adapter)"],
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/chargerconnectors/tesla_plug_acdc.png"
    }
];


export const car_features = [
    {
        label: "Wheelchair Accessible",
        valid_cars: ["van", "suv"],
        feature_type: "Accessibility",
        description: "Vehicle equipped to accommodate wheelchair users.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/wheelchair+1.png"
    },
    {
        label: "All Wheel Drive",
        valid_cars: ["suv", "truck", "crossover"],
        feature_type: "Performance",
        description: "Provides power to all wheels for better traction.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/awd+1.png"
    },
    {
        label: "Android Auto",
        valid_cars: ["sedan", "suv", "truck", "electric", "hybrid"],
        feature_type: "Infotainment",
        description: "Integrates your Android device with the car's display.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/play+1.png"
    },
    {
        label: "Apple CarPlay",
        valid_cars: ["sedan", "suv", "truck", "electric", "hybrid"],
        feature_type: "Infotainment",
        description: "Integrates your Apple device with the car's display.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/apple+1.png"
    },
    {
        label: "Aux Input",
        valid_cars: ["sedan", "suv", "truck", "electric", "hybrid"],
        feature_type: "Infotainment",
        description: "Allows you to connect external audio devices.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/auxiliary-cable+1.png"
    },
    {
        label: "Backup Camera",
        valid_cars: ["sedan", "suv", "truck", "van"],
        feature_type: "Safety",
        description: "Displays the area behind the vehicle for safer reversing.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/blind-spot-monitor+2.png"
    },
    {
        label: "Bike Rack",
        valid_cars: ["suv", "truck"],
        feature_type: "Utility",
        description: "Allows you to carry bikes on your vehicle.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/bicycle+1.png"
    },
    {
        label: "Blind Spot Camera",
        valid_cars: ["sedan", "suv", "truck", "electric"],
        feature_type: "Safety",
        description: "Provides visual assistance for blind spots.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/blind-spot+1.png"
    },
    {
        label: "Bluetooth",
        valid_cars: ["sedan", "suv", "truck", "electric", "hybrid"],
        feature_type: "Connectivity",
        description: "Allows for wireless audio and phone connectivity.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/bluetooth+1.png"
    },
    {
        label: "Child Seat",
        valid_cars: ["sedan", "suv", "van"],
        feature_type: "Safety",
        description: "Provides a secure seat for children.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/child+1.png"
    },
    {
        label: "Convertible",
        valid_cars: ["convertible"],
        feature_type: "Body Type",
        description: "Vehicle with a roof that can be removed or retracted.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/car.png"
    },
    {
        label: "GPS",
        valid_cars: ["sedan", "suv", "truck", "electric", "hybrid"],
        feature_type: "Navigation",
        description: "Provides turn-by-turn directions and maps.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/gps+1.png"
    },
    {
        label: "Heated Seat",
        valid_cars: ["sedan", "suv", "truck", "electric", "hybrid"],
        feature_type: "Comfort",
        description: "Seats that can be heated for added comfort.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/heated-seat+1.png"
    },
    {
        label: "Keyless Entry",
        valid_cars: ["sedan", "suv", "truck", "electric", "hybrid"],
        feature_type: "Convenience",
        description: "Allows entry without using a physical key.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/keyless-unlock+1.png"
    },
    {
        label: "Pet Friendly",
        valid_cars: ["sedan", "suv", "van"],
        feature_type: "Comfort",
        description: "Equipped to accommodate pets comfortably.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/pet+1.png"
    },
    {
        label: "Ski Rack",
        valid_cars: ["suv", "truck"],
        feature_type: "Utility",
        description: "Allows you to carry skis on your vehicle.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/ski+1.png"
    },
    {
        label: "Snow Tires",
        valid_cars: ["sedan", "suv", "truck"],
        feature_type: "Safety",
        description: "Special tires for improved traction on snow and ice.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/studded-tires-and-chains+1.png"
    },
    {
        label: "Sunroof",
        valid_cars: ["sedan", "suv", "truck", "convertible"],
        feature_type: "Comfort",
        description: "A roof with a panel that can be opened for ventilation.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/sunroof+1.png"
    },
    {
        label: "Toll Pass",
        valid_cars: ["sedan", "suv", "truck"],
        feature_type: "Convenience",
        description: "Electronic pass for toll payment.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/toll+1.png"
    },
    {
        label: "USB Charger",
        valid_cars: ["sedan", "suv", "truck", "electric", "hybrid"],
        feature_type: "Connectivity",
        description: "Port for charging USB devices.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/usb-charger+1.png"
    },
    {
        label: "USB Input",
        valid_cars: ["sedan", "suv", "truck", "electric", "hybrid"],
        feature_type: "Connectivity",
        description: "Port for connecting USB devices for media playback.",
        icon: "https://gr33nwh33lz-media-archives.s3.amazonaws.com/app/icons/carfeatures/usb-stick+1.png"
    }
];
