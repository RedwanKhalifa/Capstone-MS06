export type CampusCoordinate = {
  latitude: number;
  longitude: number;
};

export type CampusOverlay = {
  code: string;
  label: string;
  polygon: CampusCoordinate[];
  labelCoordinate: CampusCoordinate;
};

// Approximate TMU campus footprints traced from the public campus map view.
// These are shaped to follow the visible building outlines much more closely
// than the initial rectangular placeholders and are kept in a single file so
// the team can refine them without touching map UI logic.
export const TMU_CAMPUS_OVERLAYS: CampusOverlay[] = [
  {
    code: "MAC",
    label: "MAC",
    labelCoordinate: { latitude: 43.66158, longitude: -79.37748 },
    polygon: [
      { latitude: 43.66176, longitude: -79.37778 },
      { latitude: 43.66176, longitude: -79.3772 },
      { latitude: 43.66144, longitude: -79.37712 },
      { latitude: 43.66128, longitude: -79.37728 },
      { latitude: 43.66132, longitude: -79.37772 },
    ],
  },
  {
    code: "CAR",
    label: "CAR",
    labelCoordinate: { latitude: 43.66118, longitude: -79.37816 },
    polygon: [
      { latitude: 43.66128, longitude: -79.37834 },
      { latitude: 43.66128, longitude: -79.37802 },
      { latitude: 43.66108, longitude: -79.37802 },
      { latitude: 43.66108, longitude: -79.37834 },
    ],
  },
  {
    code: "MRS",
    label: "MRS",
    labelCoordinate: { latitude: 43.6592, longitude: -79.38618 },
    polygon: [
      { latitude: 43.6594, longitude: -79.38644 },
      { latitude: 43.65934, longitude: -79.38598 },
      { latitude: 43.659, longitude: -79.38604 },
      { latitude: 43.65904, longitude: -79.38642 },
    ],
  },
  {
    code: "CPK",
    label: "CPK",
    labelCoordinate: { latitude: 43.66012, longitude: -79.37916 },
    polygon: [
      { latitude: 43.66026, longitude: -79.37932 },
      { latitude: 43.66022, longitude: -79.37896 },
      { latitude: 43.65996, longitude: -79.379 },
      { latitude: 43.65998, longitude: -79.37928 },
    ],
  },
  {
    code: "YNG",
    label: "YNG",
    labelCoordinate: { latitude: 43.65972, longitude: -79.37848 },
    polygon: [
      { latitude: 43.6599, longitude: -79.37862 },
      { latitude: 43.65986, longitude: -79.37834 },
      { latitude: 43.65958, longitude: -79.37838 },
      { latitude: 43.65962, longitude: -79.37866 },
    ],
  },
  {
    code: "CUI",
    label: "CUI",
    labelCoordinate: { latitude: 43.65912, longitude: -79.37736 },
    polygon: [
      { latitude: 43.65926, longitude: -79.3775 },
      { latitude: 43.65922, longitude: -79.37722 },
      { latitude: 43.65896, longitude: -79.37718 },
      { latitude: 43.65892, longitude: -79.37742 },
      { latitude: 43.65904, longitude: -79.37754 },
    ],
  },
  {
    code: "MON",
    label: "MON",
    labelCoordinate: { latitude: 43.65908, longitude: -79.37662 },
    polygon: [
      { latitude: 43.6592, longitude: -79.37678 },
      { latitude: 43.65918, longitude: -79.37644 },
      { latitude: 43.65894, longitude: -79.37646 },
      { latitude: 43.65894, longitude: -79.37676 },
    ],
  },
  {
    code: "COP",
    label: "COP",
    labelCoordinate: { latitude: 43.6591, longitude: -79.3754 },
    polygon: [
      { latitude: 43.65922, longitude: -79.37556 },
      { latitude: 43.65918, longitude: -79.37524 },
      { latitude: 43.65896, longitude: -79.37524 },
      { latitude: 43.65896, longitude: -79.37556 },
    ],
  },
  {
    code: "JOR",
    label: "JOR",
    labelCoordinate: { latitude: 43.65848, longitude: -79.37844 },
    polygon: [
      { latitude: 43.65866, longitude: -79.37858 },
      { latitude: 43.65858, longitude: -79.37826 },
      { latitude: 43.65834, longitude: -79.37834 },
      { latitude: 43.65834, longitude: -79.3786 },
    ],
  },
  {
    code: "POD",
    label: "POD",
    labelCoordinate: { latitude: 43.6579, longitude: -79.37836 },
    polygon: [
      { latitude: 43.6582, longitude: -79.3787 },
      { latitude: 43.65818, longitude: -79.37808 },
      { latitude: 43.65776, longitude: -79.37802 },
      { latitude: 43.6577, longitude: -79.37834 },
      { latitude: 43.65774, longitude: -79.37872 },
    ],
  },
  {
    code: "KHW",
    label: "KHW",
    labelCoordinate: { latitude: 43.65828, longitude: -79.37794 },
    polygon: [
      { latitude: 43.65862, longitude: -79.3782 },
      { latitude: 43.65862, longitude: -79.37768 },
      { latitude: 43.65818, longitude: -79.37768 },
      { latitude: 43.65802, longitude: -79.37792 },
      { latitude: 43.65808, longitude: -79.3782 },
    ],
  },
  {
    code: "KHN",
    label: "KHN",
    labelCoordinate: { latitude: 43.65894, longitude: -79.37762 },
    polygon: [
      { latitude: 43.65914, longitude: -79.37812 },
      { latitude: 43.65912, longitude: -79.37722 },
      { latitude: 43.65884, longitude: -79.37718 },
      { latitude: 43.65866, longitude: -79.37748 },
      { latitude: 43.65874, longitude: -79.37792 },
    ],
  },
  {
    code: "KHE",
    label: "KHE",
    labelCoordinate: { latitude: 43.65842, longitude: -79.37692 },
    polygon: [
      { latitude: 43.65872, longitude: -79.37724 },
      { latitude: 43.65866, longitude: -79.3766 },
      { latitude: 43.6583, longitude: -79.37656 },
      { latitude: 43.65808, longitude: -79.37688 },
      { latitude: 43.65816, longitude: -79.37726 },
    ],
  },
  {
    code: "RAC",
    label: "RAC",
    labelCoordinate: { latitude: 43.65796, longitude: -79.37712 },
    polygon: [
      { latitude: 43.65816, longitude: -79.37758 },
      { latitude: 43.6582, longitude: -79.37678 },
      { latitude: 43.6578, longitude: -79.37668 },
      { latitude: 43.65758, longitude: -79.37702 },
      { latitude: 43.65762, longitude: -79.37742 },
    ],
  },
  {
    code: "KHS",
    label: "KHS",
    labelCoordinate: { latitude: 43.65772, longitude: -79.37704 },
    polygon: [
      { latitude: 43.65786, longitude: -79.37756 },
      { latitude: 43.65788, longitude: -79.3766 },
      { latitude: 43.65756, longitude: -79.37662 },
      { latitude: 43.65742, longitude: -79.37698 },
      { latitude: 43.65746, longitude: -79.37744 },
    ],
  },
  {
    code: "LIB",
    label: "LIB",
    labelCoordinate: { latitude: 43.65732, longitude: -79.3779 },
    polygon: [
      { latitude: 43.65752, longitude: -79.3781 },
      { latitude: 43.65748, longitude: -79.3777 },
      { latitude: 43.6572, longitude: -79.37768 },
      { latitude: 43.65716, longitude: -79.37802 },
    ],
  },
  {
    code: "SLC",
    label: "SLC",
    labelCoordinate: { latitude: 43.65706, longitude: -79.37854 },
    polygon: [
      { latitude: 43.65726, longitude: -79.37882 },
      { latitude: 43.65724, longitude: -79.3783 },
      { latitude: 43.65678, longitude: -79.37826 },
      { latitude: 43.65674, longitude: -79.3787 },
      { latitude: 43.65694, longitude: -79.3789 },
    ],
  },
  {
    code: "BKS",
    label: "BKS",
    labelCoordinate: { latitude: 43.6568, longitude: -79.37764 },
    polygon: [
      { latitude: 43.65694, longitude: -79.37782 },
      { latitude: 43.6569, longitude: -79.37746 },
      { latitude: 43.65668, longitude: -79.37746 },
      { latitude: 43.65666, longitude: -79.37778 },
    ],
  },
  {
    code: "PKG",
    label: "PKG",
    labelCoordinate: { latitude: 43.65652, longitude: -79.3776 },
    polygon: [
      { latitude: 43.65668, longitude: -79.37786 },
      { latitude: 43.65664, longitude: -79.37734 },
      { latitude: 43.65634, longitude: -79.37738 },
      { latitude: 43.65634, longitude: -79.37782 },
    ],
  },
  {
    code: "CED",
    label: "CED",
    labelCoordinate: { latitude: 43.65648, longitude: -79.37716 },
    polygon: [
      { latitude: 43.65662, longitude: -79.37732 },
      { latitude: 43.6566, longitude: -79.37702 },
      { latitude: 43.65636, longitude: -79.37704 },
      { latitude: 43.65634, longitude: -79.37728 },
    ],
  },
  {
    code: "IMA",
    label: "IMA",
    labelCoordinate: { latitude: 43.65664, longitude: -79.3768 },
    polygon: [
      { latitude: 43.65688, longitude: -79.37706 },
      { latitude: 43.65684, longitude: -79.3766 },
      { latitude: 43.65644, longitude: -79.37658 },
      { latitude: 43.65642, longitude: -79.37698 },
    ],
  },
  {
    code: "IMC",
    label: "IMC",
    labelCoordinate: { latitude: 43.65698, longitude: -79.37694 },
    polygon: [
      { latitude: 43.65714, longitude: -79.37718 },
      { latitude: 43.65714, longitude: -79.37672 },
      { latitude: 43.65686, longitude: -79.37672 },
      { latitude: 43.65684, longitude: -79.37714 },
    ],
  },
  {
    code: "OAK",
    label: "OAK",
    labelCoordinate: { latitude: 43.6571, longitude: -79.37642 },
    polygon: [
      { latitude: 43.65722, longitude: -79.37666 },
      { latitude: 43.6572, longitude: -79.37626 },
      { latitude: 43.65698, longitude: -79.3762 },
      { latitude: 43.6569, longitude: -79.3765 },
    ],
  },
  {
    code: "OKF",
    label: "OKF",
    labelCoordinate: { latitude: 43.65692, longitude: -79.37612 },
    polygon: [
      { latitude: 43.65702, longitude: -79.37628 },
      { latitude: 43.657, longitude: -79.37602 },
      { latitude: 43.65684, longitude: -79.37602 },
      { latitude: 43.65682, longitude: -79.37624 },
    ],
  },
  {
    code: "SCC",
    label: "SCC",
    labelCoordinate: { latitude: 43.65692, longitude: -79.37588 },
    polygon: [
      { latitude: 43.65704, longitude: -79.3761 },
      { latitude: 43.65702, longitude: -79.37568 },
      { latitude: 43.65676, longitude: -79.3757 },
      { latitude: 43.65676, longitude: -79.37606 },
    ],
  },
  {
    code: "HEI",
    label: "HEI",
    labelCoordinate: { latitude: 43.65656, longitude: -79.37618 },
    polygon: [
      { latitude: 43.65672, longitude: -79.37638 },
      { latitude: 43.6567, longitude: -79.37598 },
      { latitude: 43.65644, longitude: -79.37602 },
      { latitude: 43.65642, longitude: -79.37634 },
    ],
  },
  {
    code: "ENG",
    label: "ENG",
    labelCoordinate: { latitude: 43.6563, longitude: -79.37516 },
    polygon: [
      { latitude: 43.65708, longitude: -79.37546 },
      { latitude: 43.65702, longitude: -79.37472 },
      { latitude: 43.65558, longitude: -79.3747 },
      { latitude: 43.65558, longitude: -79.37536 },
      { latitude: 43.656, longitude: -79.37546 },
      { latitude: 43.65634, longitude: -79.3754 },
      { latitude: 43.65676, longitude: -79.37548 },
    ],
  },
  {
    code: "MER",
    label: "MER",
    labelCoordinate: { latitude: 43.65618, longitude: -79.3746 },
    polygon: [
      { latitude: 43.65654, longitude: -79.37482 },
      { latitude: 43.6565, longitude: -79.37436 },
      { latitude: 43.65586, longitude: -79.37434 },
      { latitude: 43.65586, longitude: -79.3748 },
    ],
  },
  {
    code: "DAL",
    label: "DAL",
    labelCoordinate: { latitude: 43.65606, longitude: -79.37428 },
    polygon: [
      { latitude: 43.65622, longitude: -79.37444 },
      { latitude: 43.6562, longitude: -79.37414 },
      { latitude: 43.65596, longitude: -79.37416 },
      { latitude: 43.65596, longitude: -79.37442 },
    ],
  },
  {
    code: "BON",
    label: "BON",
    labelCoordinate: { latitude: 43.65602, longitude: -79.37604 },
    polygon: [
      { latitude: 43.65616, longitude: -79.37618 },
      { latitude: 43.65614, longitude: -79.37592 },
      { latitude: 43.65592, longitude: -79.37594 },
      { latitude: 43.65592, longitude: -79.37616 },
    ],
  },
  {
    code: "PRO",
    label: "PRO",
    labelCoordinate: { latitude: 43.65578, longitude: -79.37606 },
    polygon: [
      { latitude: 43.65588, longitude: -79.37616 },
      { latitude: 43.65586, longitude: -79.37594 },
      { latitude: 43.6557, longitude: -79.37596 },
      { latitude: 43.6557, longitude: -79.37614 },
    ],
  },
  {
    code: "SBB",
    label: "SBB",
    labelCoordinate: { latitude: 43.65558, longitude: -79.37592 },
    polygon: [
      { latitude: 43.65572, longitude: -79.37614 },
      { latitude: 43.6557, longitude: -79.37572 },
      { latitude: 43.65544, longitude: -79.37574 },
      { latitude: 43.65546, longitude: -79.37614 },
    ],
  },
  {
    code: "VIC",
    label: "VIC",
    labelCoordinate: { latitude: 43.65594, longitude: -79.37728 },
    polygon: [
      { latitude: 43.65618, longitude: -79.37752 },
      { latitude: 43.65614, longitude: -79.37698 },
      { latitude: 43.65574, longitude: -79.377 },
      { latitude: 43.65576, longitude: -79.37746 },
    ],
  },
  {
    code: "DSQ",
    label: "DSQ",
    labelCoordinate: { latitude: 43.65564, longitude: -79.37798 },
    polygon: [
      { latitude: 43.65578, longitude: -79.37818 },
      { latitude: 43.65574, longitude: -79.3778 },
      { latitude: 43.65548, longitude: -79.37784 },
      { latitude: 43.6555, longitude: -79.37816 },
    ],
  },
  {
    code: "DCC",
    label: "DCC",
    labelCoordinate: { latitude: 43.65566, longitude: -79.37524 },
    polygon: [
      { latitude: 43.65618, longitude: -79.37554 },
      { latitude: 43.6561, longitude: -79.37492 },
      { latitude: 43.6553, longitude: -79.37494 },
      { latitude: 43.65532, longitude: -79.37554 },
    ],
  },
  {
    code: "SID",
    label: "SID",
    labelCoordinate: { latitude: 43.6562, longitude: -79.37566 },
    polygon: [
      { latitude: 43.65654, longitude: -79.37586 },
      { latitude: 43.65652, longitude: -79.37544 },
      { latitude: 43.65596, longitude: -79.37546 },
      { latitude: 43.65594, longitude: -79.37584 },
    ],
  },
  {
    code: "ILC",
    label: "ILC",
    labelCoordinate: { latitude: 43.65788, longitude: -79.3741 },
    polygon: [
      { latitude: 43.65804, longitude: -79.37426 },
      { latitude: 43.65802, longitude: -79.37392 },
      { latitude: 43.65774, longitude: -79.37392 },
      { latitude: 43.65774, longitude: -79.37424 },
    ],
  },
  {
    code: "AOB",
    label: "AOB",
    labelCoordinate: { latitude: 43.65528, longitude: -79.3792 },
    polygon: [
      { latitude: 43.65552, longitude: -79.37972 },
      { latitude: 43.65542, longitude: -79.37864 },
      { latitude: 43.65508, longitude: -79.37844 },
      { latitude: 43.6549, longitude: -79.37882 },
      { latitude: 43.65494, longitude: -79.37936 },
    ],
  },
  {
    code: "TRS",
    label: "TRS",
    labelCoordinate: { latitude: 43.65454, longitude: -79.37908 },
    polygon: [
      { latitude: 43.6549, longitude: -79.3797 },
      { latitude: 43.65476, longitude: -79.37856 },
      { latitude: 43.65436, longitude: -79.37834 },
      { latitude: 43.65402, longitude: -79.37858 },
      { latitude: 43.65404, longitude: -79.37944 },
      { latitude: 43.65436, longitude: -79.37978 },
    ],
  },
  {
    code: "YDI",
    label: "YDI",
    labelCoordinate: { latitude: 43.65492, longitude: -79.37862 },
    polygon: [
      { latitude: 43.65504, longitude: -79.37878 },
      { latitude: 43.65504, longitude: -79.37848 },
      { latitude: 43.65484, longitude: -79.37848 },
      { latitude: 43.65484, longitude: -79.37876 },
    ],
  },
  {
    code: "TEC",
    label: "TEC",
    labelCoordinate: { latitude: 43.65414, longitude: -79.3777 },
    polygon: [
      { latitude: 43.65508, longitude: -79.37834 },
      { latitude: 43.65498, longitude: -79.37686 },
      { latitude: 43.65458, longitude: -79.37634 },
      { latitude: 43.65356, longitude: -79.37648 },
      { latitude: 43.65346, longitude: -79.37734 },
      { latitude: 43.65374, longitude: -79.37806 },
      { latitude: 43.65436, longitude: -79.37836 },
    ],
  },
  {
    code: "BTS",
    label: "BTS",
    labelCoordinate: { latitude: 43.65354, longitude: -79.37898 },
    polygon: [
      { latitude: 43.65396, longitude: -79.3793 },
      { latitude: 43.65382, longitude: -79.37856 },
      { latitude: 43.65342, longitude: -79.37838 },
      { latitude: 43.6531, longitude: -79.37856 },
      { latitude: 43.65308, longitude: -79.37916 },
      { latitude: 43.65334, longitude: -79.37938 },
    ],
  },
  {
    code: "SMH",
    label: "SMH",
    labelCoordinate: { latitude: 43.6539, longitude: -79.37602 },
    polygon: [
      { latitude: 43.65408, longitude: -79.3762 },
      { latitude: 43.65406, longitude: -79.37588 },
      { latitude: 43.65382, longitude: -79.3759 },
      { latitude: 43.65382, longitude: -79.37618 },
    ],
  },
  {
    code: "MAG",
    label: "MAG",
    labelCoordinate: { latitude: 43.64928, longitude: -79.37472 },
    polygon: [
      { latitude: 43.64938, longitude: -79.37488 },
      { latitude: 43.64936, longitude: -79.37458 },
      { latitude: 43.64916, longitude: -79.3746 },
      { latitude: 43.64916, longitude: -79.37486 },
    ],
  },
];
